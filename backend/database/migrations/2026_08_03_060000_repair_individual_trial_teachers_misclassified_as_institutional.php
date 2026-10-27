<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Individual trial signups were misclassified as institutional when a free-text
 * school_board value was present. Restore them to a normal personal trial.
 */
return new class extends Migration
{
    public function up(): void
    {
        User::query()
            ->where('role', 'teacher')
            ->where('affiliation_type', 'individual')
            ->where(function ($q) {
                $q->where('subscription_plan', 'institutional')
                    ->orWhere('registration_source', 'school_registration')
                    ->orWhere('registration_source', 'board_registration')
                    ->orWhere('registration_source', 'school_assigned')
                    ->orWhere('registration_source', 'board_assigned');
            })
            ->orderBy('id')
            ->each(function (User $teacher) {
                $trialStart = $teacher->trial_started_at ?? $teacher->created_at ?? now();
                $trialEnd = $teacher->trial_ends_at;
                if (! $trialEnd || $teacher->subscription_plan === 'institutional') {
                    $trialEnd = $trialStart->copy()->addDays(30);
                }

                $teacher->forceFill([
                    'registration_source' => null,
                    'subscription_plan' => null,
                    'subscription_billing' => null,
                    'subscription_started_at' => null,
                    'subscription_ends_at' => null,
                    'stripe_subscription_id' => $teacher->stripe_subscription_id, // leave Stripe alone
                    'trial_started_at' => $trialStart,
                    'trial_ends_at' => $trialEnd,
                    'subscription_status' => 'trialing',
                ])->save();
            });

        // Signups that were auto-activated without email verification should await activation.
        DB::table('users')
            ->where('role', 'teacher')
            ->where('affiliation_type', 'individual')
            ->whereNull('email_verified_at')
            ->where('account_status', 'active')
            ->whereNull('registration_source')
            ->update(['account_status' => 'inactive']);
    }

    public function down(): void
    {
        // Irreversible data repair.
    }
};
