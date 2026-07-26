<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AccountActivationController extends Controller
{
    public function __invoke(Request $request, User $user): RedirectResponse
    {
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');

        if (! in_array($user->role, ['teacher', 'school_admin', 'board_admin'], true)) {
            return redirect()->away($frontend.'/signin?activation=invalid');
        }

        if ($user->account_status === 'archived') {
            return redirect()->away($this->loginPath($user).'?activation=archived');
        }

        $wasInactive = $user->account_status === 'inactive' || $user->email_verified_at === null;

        $user->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        if ($user->role === 'teacher') {
            $user->startTrialIfNeeded();
        }

        if ($wasInactive) {
            NotificationMailer::sendWelcome($user->fresh());
        }

        AuditLogger::log(
            'Activate',
            match ($user->role) {
                'school_admin' => 'School',
                'board_admin' => 'Board',
                default => 'Teacher',
            },
            "{$user->displayName()} activated account via email",
            'info',
            $request,
            subject: $user,
        );

        return redirect()->away($this->loginPath($user).'?activation=success');
    }

    private function loginPath(User $user): string
    {
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');

        return match ($user->role) {
            'school_admin' => $frontend.'/?portal=ecole',
            'board_admin' => $frontend.'/?portal=conseil',
            default => $frontend.'/signin',
        };
    }
}
