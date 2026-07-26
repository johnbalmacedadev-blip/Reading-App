<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherEntitled
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'teacher') {
            return new JsonResponse(['message' => 'Teacher portal access required.'], 403);
        }

        if ($user->account_status === 'pending') {
            return new JsonResponse([
                'message' => 'Your account is deactivated until your school or school board activates it.',
                'account_deactivated' => true,
            ], 403);
        }

        // Subscription status and Stripe Checkout must remain accessible after trial expiry.
        if ($request->is('api/teacher/subscription*')) {
            return $next($request);
        }

        $user->startTrialIfNeeded();

        if (
            ! $user->isInstitutionalTeacher()
            && ! $user->hasActiveTrial()
            && ! $user->hasActiveSubscription()
        ) {
            return new JsonResponse([
                'message' => 'Your trial has ended. Activate a subscription to continue.',
                'subscription_required' => true,
            ], 402);
        }

        return $next($request);
    }
}
