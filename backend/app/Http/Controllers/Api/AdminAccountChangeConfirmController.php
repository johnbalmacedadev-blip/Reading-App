<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminAccountChangeConfirmController extends Controller
{
    public function __invoke(Request $request, User $user): RedirectResponse
    {
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');
        $settingsUrl = $frontend.'/admin/settings';

        if ($user->role !== 'admin') {
            return redirect()->away($settingsUrl.'?account=invalid');
        }

        if (! filled($user->pending_username) && ! filled($user->pending_contact_email)) {
            return redirect()->away($settingsUrl.'?account=expired');
        }

        $fill = [];

        if (filled($user->pending_username)) {
            $loginEmail = User::adminLoginEmail((string) $user->pending_username);
            if (User::query()->where('email', $loginEmail)->where('id', '!=', $user->id)->exists()) {
                return redirect()->away($settingsUrl.'?account=conflict');
            }
            $fill['email'] = $loginEmail;
        }

        if (filled($user->pending_contact_email)) {
            $contact = strtolower(trim((string) $user->pending_contact_email));
            if (User::query()->where('contact_email', $contact)->where('id', '!=', $user->id)->exists()) {
                return redirect()->away($settingsUrl.'?account=conflict');
            }
            if (User::query()->where('email', $contact)->where('id', '!=', $user->id)->exists()) {
                return redirect()->away($settingsUrl.'?account=conflict');
            }
            $fill['contact_email'] = $contact;
            $fill['email_verified_at'] = now();
        }

        $fill['pending_username'] = null;
        $fill['pending_contact_email'] = null;

        $user->forceFill($fill)->save();

        AuditLogger::log(
            'Activate',
            'Admin',
            "{$user->displayName()} confirmed admin account credential changes",
            'info',
            $request,
            subject: $user,
        );

        return redirect()->away($settingsUrl.'?account=confirmed');
    }
}
