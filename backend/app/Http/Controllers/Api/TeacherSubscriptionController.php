<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TeacherNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TeacherSubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);

        if ($teacher->isInstitutionalTeacher()) {
            $sponsor = $teacher->institutionalSponsor();
            if ($sponsor) {
                \App\Services\InstitutionalSubscriptionService::syncRegistrationCoverage($teacher, $sponsor);
                $teacher->refresh();
            }
        } else {
            $teacher->startTrialIfNeeded();
        }

        if ($teacher->stripe_subscription_id) {
            try {
                $this->syncSubscription($teacher);
            } catch (Throwable $exception) {
                Log::warning('Unable to refresh Stripe subscription', [
                    'user_id' => $teacher->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json(['subscription' => $this->format($teacher->fresh())]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate([
            'plan' => ['required', 'in:essentials,insights'],
            'billing' => ['required', 'in:monthly,annual'],
        ]);

        if ($teacher->isInstitutionalTeacher()) {
            return response()->json([
                'message' => 'Your access is covered by your school or school board. Personal subscription is not required.',
            ], 422);
        }

        if ($teacher->hasActiveSubscription()) {
            return response()->json(['message' => 'Your subscription is already active.'], 422);
        }

        $stripe = $this->stripe();
        $customerId = $teacher->stripe_customer_id;

        if (! $customerId) {
            $customer = $stripe->customers->create([
                'email' => $teacher->email,
                'name' => $teacher->displayName(),
                'metadata' => ['user_id' => (string) $teacher->id],
            ]);
            $customerId = $customer->id;
            $teacher->forceFill(['stripe_customer_id' => $customerId])->save();
        }

        $billing = $data['billing'];
        $monthlyAmount = $data['plan'] === 'insights' ? 1999 : 1499;
        $unitAmount = $billing === 'annual' ? $monthlyAmount * 12 : $monthlyAmount;
        $interval = $billing === 'annual' ? 'year' : 'month';
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');
        $taxRateId = (string) config('services.stripe.tax_rate_id');
        abort_if($taxRateId === '', 503, 'Stripe tax rate is not configured.');
        $planName = $data['plan'] === 'insights' ? 'Insights' : 'Essentials';

        $session = $stripe->checkout->sessions->create([
            'mode' => 'subscription',
            'customer' => $customerId,
            'client_reference_id' => (string) $teacher->id,
            'line_items' => [[
                'quantity' => 1,
                'tax_rates' => [$taxRateId],
                'price_data' => [
                    'currency' => config('services.stripe.currency', 'cad'),
                    'unit_amount' => $unitAmount,
                    'recurring' => ['interval' => $interval],
                    'product_data' => [
                        'name' => "Lecture Scientifique — {$planName}",
                        'description' => $billing === 'annual'
                            ? 'Annual teacher subscription'
                            : 'Monthly teacher subscription',
                    ],
                ],
            ]],
            'metadata' => [
                'user_id' => (string) $teacher->id,
                'plan' => $data['plan'],
                'billing' => $billing,
            ],
            'subscription_data' => [
                'cancel_at_period_end' => false,
                'metadata' => [
                    'user_id' => (string) $teacher->id,
                    'plan' => $data['plan'],
                    'billing' => $billing,
                ],
            ],
            'success_url' => $frontend.'/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontend.'/subscription?checkout=cancelled',
            'allow_promotion_codes' => true,
        ]);

        AuditLogger::log(
            'Subscription',
            'Billing',
            'Stripe Checkout opened',
            'info',
            $request,
            subject: $teacher,
            metadata: ['plan' => $data['plan'], 'billing' => $billing],
        );

        return response()->json(['checkout_url' => $session->url]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);
        $data = $request->validate(['session_id' => ['required', 'string', 'max:255']]);

        $session = $this->stripe()->checkout->sessions->retrieve(
            $data['session_id'],
            ['expand' => ['subscription']],
        );

        if (
            $session->status !== 'complete'
            || (string) ($session->metadata->user_id ?? '') !== (string) $teacher->id
            || ! $session->subscription
        ) {
            return response()->json(['message' => 'Stripe Checkout has not been completed.'], 422);
        }

        $subscription = $session->subscription;
        $periodEnd = $this->resolvePeriodEndTimestamp($subscription);
        $autoRenew = ! (bool) ($subscription->cancel_at_period_end ?? false);
        $teacher->forceFill([
            'subscription_status' => in_array($subscription->status, ['active', 'trialing'], true)
                ? 'active'
                : $subscription->status,
            'subscription_plan' => (string) ($session->metadata->plan ?? 'essentials'),
            'subscription_billing' => (string) ($session->metadata->billing ?? 'monthly'),
            'stripe_customer_id' => (string) $session->customer,
            'stripe_subscription_id' => $subscription->id,
            'subscription_started_at' => now(),
            'subscription_ends_at' => $periodEnd
                ? date('Y-m-d H:i:s', $periodEnd)
                : $teacher->subscription_ends_at,
            'subscription_auto_renew' => $autoRenew,
        ])->save();
        TeacherNotificationService::subscriptionActivated($teacher);

        AuditLogger::log(
            'Subscription',
            'Billing',
            'Teacher subscription activated through Stripe',
            'info',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'subscription' => $this->format($teacher->fresh()),
            'message' => 'Subscription activated.',
        ]);
    }

    public function portal(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);

        if (! $teacher->stripe_customer_id) {
            return response()->json(['message' => 'No Stripe billing account exists yet.'], 422);
        }

        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');
        $session = $this->stripe()->billingPortal->sessions->create([
            'customer' => $teacher->stripe_customer_id,
            'return_url' => $frontend.'/subscription',
        ]);

        return response()->json(['portal_url' => $session->url]);
    }

    public function webhook(Request $request): Response
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret === '') {
            return response('Stripe webhook is not configured.', 503);
        }

        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                $secret,
            );
        } catch (Throwable) {
            return response('Invalid webhook signature.', 400);
        }

        $object = $event->data->object;

        if ($event->type === 'checkout.session.completed') {
            $teacher = User::query()->find((int) ($object->metadata->user_id ?? 0));
            if ($teacher && $object->subscription) {
                $subscriptionId = is_string($object->subscription)
                    ? $object->subscription
                    : (string) ($object->subscription->id ?? '');
                $fill = [
                    'subscription_status' => 'active',
                    'subscription_plan' => (string) ($object->metadata->plan ?? 'essentials'),
                    'subscription_billing' => (string) ($object->metadata->billing ?? 'monthly'),
                    'stripe_customer_id' => (string) $object->customer,
                    'stripe_subscription_id' => $subscriptionId,
                    'subscription_started_at' => $teacher->subscription_started_at ?? now(),
                    'subscription_auto_renew' => true,
                ];

                if (! is_string($object->subscription)) {
                    $periodEnd = $this->resolvePeriodEndTimestamp($object->subscription);
                    if ($periodEnd) {
                        $fill['subscription_ends_at'] = date('Y-m-d H:i:s', $periodEnd);
                    }
                    if (isset($object->subscription->cancel_at_period_end)) {
                        $fill['subscription_auto_renew'] = ! (bool) $object->subscription->cancel_at_period_end;
                    }
                }

                $teacher->forceFill($fill)->save();
                TeacherNotificationService::subscriptionActivated($teacher);
            }
        }

        if ($event->type === 'invoice.paid') {
            $this->handleInvoicePaid($object);
        }

        if ($event->type === 'invoice.payment_failed') {
            $this->handleInvoicePaymentFailed($object);
        }

        if (str_starts_with($event->type, 'customer.subscription.')) {
            $teacher = User::query()
                ->where('stripe_subscription_id', (string) $object->id)
                ->orWhere('stripe_customer_id', (string) $object->customer)
                ->first();

            if ($teacher) {
                $previousStatus = $teacher->subscription_status;
                $this->applyStripeSubscription($teacher, $object);
                $teacher->refresh();

                if ($event->type === 'customer.subscription.deleted' || $teacher->subscription_status === 'canceled') {
                    TeacherNotificationService::subscriptionCancelled($teacher);
                    if ($teacher->subscription_ends_at) {
                        TeacherNotificationService::subscriptionExpiring($teacher);
                    }
                } elseif (
                    $previousStatus !== 'active'
                    && $teacher->subscription_status === 'active'
                    && $previousStatus !== null
                    && $previousStatus !== 'trialing'
                ) {
                    // Reactivation after past_due / unpaid — renew notice handled mainly via invoice.paid.
                }
            }
        }

        return response('ok');
    }

    private function handleInvoicePaid(object $invoice): void
    {
        $billingReason = (string) ($invoice->billing_reason ?? '');
        $teacher = $this->teacherFromInvoice($invoice);
        if (! $teacher) {
            return;
        }

        $periodEnd = null;
        if (! empty($invoice->lines->data[0]->period->end)) {
            $periodEnd = \Carbon\Carbon::createFromTimestamp((int) $invoice->lines->data[0]->period->end);
            $teacher->forceFill([
                'subscription_ends_at' => $periodEnd->toDateTimeString(),
                'subscription_status' => 'active',
                'subscription_auto_renew' => true,
            ])->save();
        }

        // First payment after checkout is covered by subscriptionActivated.
        // Cycle renewals (auto-renew paid) get the renewed email for the new period.
        if (in_array($billingReason, ['subscription_cycle', 'subscription_update'], true)) {
            TeacherNotificationService::subscriptionRenewed(
                $teacher->fresh(),
                (string) ($invoice->id ?? null),
                $periodEnd,
            );
        } elseif ($billingReason === 'subscription_create' || $billingReason === '') {
            if (! $teacher->stripe_subscription_id && ! empty($invoice->subscription)) {
                $teacher->forceFill([
                    'stripe_subscription_id' => (string) $invoice->subscription,
                    'subscription_status' => 'active',
                    'subscription_auto_renew' => true,
                ])->save();
            }
            TeacherNotificationService::subscriptionActivated($teacher->fresh());
        }
    }

    private function handleInvoicePaymentFailed(object $invoice): void
    {
        $teacher = $this->teacherFromInvoice($invoice);
        if (! $teacher) {
            return;
        }

        $teacher->forceFill([
            'subscription_status' => 'past_due',
        ])->save();

        TeacherNotificationService::paymentFailed($teacher, (string) ($invoice->id ?? null));
    }

    private function teacherFromInvoice(object $invoice): ?User
    {
        $customerId = (string) ($invoice->customer ?? '');
        $subscriptionId = (string) ($invoice->subscription ?? '');

        if ($subscriptionId !== '') {
            $bySub = User::query()->where('stripe_subscription_id', $subscriptionId)->first();
            if ($bySub) {
                return $bySub;
            }
        }

        if ($customerId !== '') {
            return User::query()->where('stripe_customer_id', $customerId)->first();
        }

        return null;
    }

    private function syncSubscription(User $teacher): void
    {
        $subscription = $this->stripe()->subscriptions->retrieve($teacher->stripe_subscription_id);
        $this->applyStripeSubscription($teacher, $subscription);
    }

    private function applyStripeSubscription(User $teacher, object $subscription): void
    {
        $status = in_array($subscription->status, ['active', 'trialing'], true)
            ? 'active'
            : (string) $subscription->status;

        $periodEnd = $this->resolvePeriodEndTimestamp($subscription);
        $autoRenew = ! (bool) ($subscription->cancel_at_period_end ?? false);

        $fill = [
            'subscription_status' => $status,
            'subscription_auto_renew' => $autoRenew,
        ];

        // Never wipe a known renewal date if Stripe omits period end on this payload.
        if ($periodEnd) {
            $fill['subscription_ends_at'] = date('Y-m-d H:i:s', $periodEnd);
        }

        if (empty($teacher->subscription_started_at) && ! empty($subscription->start_date)) {
            $fill['subscription_started_at'] = date('Y-m-d H:i:s', (int) $subscription->start_date);
        } elseif (empty($teacher->subscription_started_at) && ! empty($subscription->created)) {
            $fill['subscription_started_at'] = date('Y-m-d H:i:s', (int) $subscription->created);
        }

        $teacher->forceFill($fill)->save();
    }

    /** Resolve current period end across Stripe API shapes (subscription or item level). */
    private function resolvePeriodEndTimestamp(object $subscription): ?int
    {
        $candidates = [
            $subscription->current_period_end ?? null,
            $subscription->items->data[0]->current_period_end ?? null,
            $subscription->items['data'][0]['current_period_end'] ?? null,
        ];

        foreach ($candidates as $value) {
            if (is_numeric($value) && (int) $value > 0) {
                return (int) $value;
            }
        }

        return null;
    }

    private function teacher(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user?->role === 'teacher', 403);

        return $user;
    }

    private function stripe(): StripeClient
    {
        $secret = (string) config('services.stripe.secret');
        abort_if($secret === '', 503, 'Stripe is not configured.');

        return new StripeClient($secret);
    }

    private function format(User $teacher): array
    {
        $autoRenew = $teacher->subscription_auto_renew;
        if ($autoRenew === null) {
            $autoRenew = true;
        }

        return [
            'status' => $teacher->subscription_status,
            'plan' => $teacher->subscription_plan,
            'billing' => $teacher->subscription_billing,
            'trial_started_at' => $teacher->trial_started_at?->toIso8601String(),
            'trial_ends_at' => $teacher->trial_ends_at?->toIso8601String(),
            'trial_days_remaining' => $teacher->trialDaysRemaining(),
            'is_trial_active' => $teacher->hasActiveTrial(),
            'is_active' => $teacher->hasActiveSubscription() && $teacher->subscription_plan !== 'institutional',
            'is_institutional' => $teacher->isInstitutionalTeacher(),
            'is_registration_licensed' => $teacher->isRegistrationLicensedTeacher(),
            'can_access_reports' => $teacher->canAccessReports(),
            'can_access_classroom' => $teacher->canAccessClassroomFeatures(),
            'tax_rate_percent' => 13,
            'subscription_started_at' => $teacher->subscription_started_at?->toIso8601String(),
            'subscription_ends_at' => $teacher->subscription_ends_at?->toIso8601String(),
            'auto_renew' => (bool) $autoRenew,
            'has_billing_account' => (bool) $teacher->stripe_customer_id,
        ];
    }
}
