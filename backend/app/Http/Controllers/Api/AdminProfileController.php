<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $this->assertAdmin($admin);

        return response()->json([
            'profile' => $this->formatProfile($admin),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $this->assertAdmin($admin);

        $data = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:64', 'regex:/^[a-zA-Z0-9._-]+$/'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'contact_email')->ignore($admin->id),
            ],
            'current_password' => ['required', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($data['current_password'], $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $username = strtolower(trim($data['username']));
        $contactEmail = strtolower(trim((string) ($data['email'] ?? '')));
        $loginEmail = User::adminLoginEmail($username);

        if (User::query()->where('email', $loginEmail)->where('id', '!=', $admin->id)->exists()) {
            throw ValidationException::withMessages([
                'username' => ['This username is already taken.'],
            ]);
        }

        // Contact email must not collide with another user's login email either.
        if ($contactEmail !== '' && User::query()->where('email', $contactEmail)->where('id', '!=', $admin->id)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already in use.'],
            ]);
        }

        $passwordChanged = false;
        if (! empty($data['password'])) {
            $admin->password = $data['password'];
            $passwordChanged = true;
        }

        $currentUsername = $admin->adminUsername();
        $currentEmail = strtolower(trim((string) ($admin->contact_email ?? '')));
        $usernameChanged = $username !== $currentUsername;
        $emailChanged = $contactEmail !== $currentEmail;

        if (! $usernameChanged && ! $emailChanged && ! $passwordChanged) {
            return response()->json([
                'profile' => $this->formatProfile($admin),
                'message' => 'No changes to save.',
            ]);
        }

        $messageParts = [];

        if ($passwordChanged) {
            $admin->save();
            $messageParts[] = 'Password updated.';
            AuditLogger::log('Edit', 'Admin', 'Admin password updated', 'info', $request, subject: $admin);
        }

        if ($usernameChanged || $emailChanged) {
            $activationEmail = $emailChanged ? $contactEmail : $currentEmail;
            if ($activationEmail === '') {
                $activationEmail = $contactEmail;
            }

            if ($activationEmail === '') {
                throw ValidationException::withMessages([
                    'email' => ['A deliverable email address is required to confirm username or email changes.'],
                ]);
            }

            $admin->pending_username = $usernameChanged ? $username : null;
            $admin->pending_contact_email = $emailChanged ? $contactEmail : null;
            $admin->save();

            $activationUrl = URL::temporarySignedRoute(
                'admin.account.confirm',
                now()->addHours(48),
                ['user' => $admin->id],
            );

            $results = NotificationMailer::sendAdminCredentialChange($admin->fresh(), $activationUrl, [
                'username' => $usernameChanged ? $username : null,
                'email' => $emailChanged || $currentEmail === '' ? $activationEmail : null,
                'old_username' => $usernameChanged ? $currentUsername : null,
                'old_email' => $currentEmail !== '' ? $currentEmail : null,
            ]);

            if ($results['activation'] === 'skipped') {
                $admin->pending_username = null;
                $admin->pending_contact_email = null;
                $admin->save();

                throw ValidationException::withMessages([
                    'email' => ['A deliverable email address is required to confirm username or email changes.'],
                ]);
            }

            if ($results['activation'] === 'failed') {
                return response()->json([
                    'profile' => $this->formatProfile($admin->fresh()),
                    'message' => 'Changes saved as pending, but the activation email could not be sent. Check mail configuration and try again.',
                ], 502);
            }

            $messageParts[] = 'Activation and confirmation emails were sent. Confirm the link to apply username/email changes.';
            AuditLogger::log(
                'Edit',
                'Admin',
                'Admin credential change requested (pending confirmation)',
                'info',
                $request,
                subject: $admin,
            );
        }

        return response()->json([
            'profile' => $this->formatProfile($admin->fresh()),
            'message' => implode(' ', $messageParts) ?: 'Admin account updated.',
        ]);
    }

    private function assertAdmin(User $user): void
    {
        abort_unless($user->role === 'admin', 403, 'Admin access required.');
    }

    /** @return array<string, mixed> */
    private function formatProfile(User $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->displayName(),
            'username' => $admin->adminUsername(),
            'email' => $admin->contact_email,
            'pending_username' => $admin->pending_username,
            'pending_email' => $admin->pending_contact_email,
            'has_pending_change' => filled($admin->pending_username) || filled($admin->pending_contact_email),
        ];
    }
}
