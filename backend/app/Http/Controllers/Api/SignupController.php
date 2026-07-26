<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SignupController extends Controller
{
    public function complete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', 'max:50'],
            'account_type' => ['nullable', 'in:individual,school'],
            'invite_type' => ['nullable', 'in:school,board'],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'board_code' => ['nullable', 'string', 'max:50'],
            'plan' => ['nullable', 'in:essentials,insights'],
            'billing' => ['nullable', 'in:monthly,annual'],
            'amount' => ['nullable', 'string', 'max:50'],
            'due_today' => ['nullable', 'string', 'max:50'],
            'next_billing_date' => ['nullable', 'string', 'max:100'],
            'preferred_language' => ['nullable', 'in:en,fr'],
        ]);

        $accountType = $data['account_type'] ?? 'individual';
        $data['preferred_language'] = $this->resolvePreferredLanguage($data['preferred_language'] ?? null);

        if ($accountType === 'school') {
            return $this->completeSchoolJoin($request, $data);
        }

        return $this->completeIndividualSignup($request, $data);
    }

    private function completeIndividualSignup(Request $request, array $data): JsonResponse
    {
        $user = DB::transaction(function () use ($data) {
            return User::create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => strtolower(trim($data['email'])),
                'password' => $data['password'],
                'role' => 'teacher',
                'preferred_language' => $data['preferred_language'],
                'school_board' => $data['school_board'] ?: null,
                'account_status' => 'active',
                'affiliation_type' => 'individual',
                'started_at' => now()->toDateString(),
                'trial_started_at' => now(),
                'trial_ends_at' => now()->addDays(30),
                'subscription_status' => 'trialing',
                'subscription_plan' => $data['plan'] ?? null,
            ]);
        });

        Auth::login($user);
        $request->session()->regenerate();

        try {
            NotificationMailer::sendWelcome($user);
        } catch (\Throwable $e) {
            Log::error('Signup emails failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLogger::log('Create', 'Teacher', "{$user->displayName()} signed up", 'info', $request, subject: $user);

        return response()->json([
            'message' => 'Account created.',
            'pending_activation' => false,
            'user' => $this->formatAuthUser($user),
        ], 201);
    }

    private function completeSchoolJoin(Request $request, array $data): JsonResponse
    {
        $inviteType = $data['invite_type'] ?? null;
        if (! in_array($inviteType, ['school', 'board'], true)) {
            throw ValidationException::withMessages([
                'invite_type' => ['Please choose whether you were invited by a school or a school board.'],
            ]);
        }

        $schoolId = null;
        $boardCode = null;
        $schoolBoardLabel = $data['school_board'] ?: null;

        if ($inviteType === 'school') {
            $schoolId = (int) ($data['school_id'] ?? 0);
            $school = School::query()->where('id', $schoolId)->where('status', 'active')->first();
            if (! $school) {
                throw ValidationException::withMessages([
                    'school_id' => ['Please select the school that invited you.'],
                ]);
            }
            $boardCode = $school->school_board;
            $schoolBoardLabel = $school->school_board;
        } else {
            $boardCode = trim((string) ($data['board_code'] ?? ''));
            $board = SchoolBoard::query()->where('code', $boardCode)->where('status', 'active')->first();
            if (! $board) {
                throw ValidationException::withMessages([
                    'board_code' => ['Please select the school board that invited you.'],
                ]);
            }
            $schoolBoardLabel = $board->code;
        }

        $user = DB::transaction(function () use ($data, $inviteType, $schoolId, $boardCode, $schoolBoardLabel) {
            return User::create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => strtolower(trim($data['email'])),
                'password' => $data['password'],
                'role' => 'teacher',
                'preferred_language' => $data['preferred_language'],
                'school_id' => $inviteType === 'school' ? $schoolId : null,
                'school_board' => $schoolBoardLabel,
                'account_status' => 'pending',
                'affiliation_type' => $inviteType,
                'requested_board_code' => $inviteType === 'board' ? $boardCode : null,
                'join_requested_at' => now(),
                'subscription_status' => null,
                'subscription_plan' => null,
            ]);
        });

        try {
            NotificationMailer::sendWelcome($user);
        } catch (\Throwable $e) {
            Log::error('Signup emails failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLogger::log(
            'Create',
            'Teacher',
            "{$user->displayName()} requested join via {$inviteType}",
            'info',
            $request,
            subject: $user,
        );

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Your access request was submitted. Your account is deactivated until your school or school board activates it.',
            'pending_activation' => true,
            'user' => $this->formatAuthUser($user->loadMissing('school')),
        ], 201);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', strtolower(trim($data['email'])))->first();

        // Always return success to avoid account enumeration
        if (! $user) {
            return response()->json([
                'message' => 'If that email exists, a reset link has been sent.',
            ]);
        }

        $token = Password::broker()->createToken($user);
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');
        $resetUrl = $frontend.'/reset-password?'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]);

        try {
            NotificationMailer::sendResetPassword($user, $resetUrl, 30);
        } catch (\Throwable $e) {
            Log::error('Password reset email failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Unable to send reset email. Please try again later.'],
            ]);
        }

        return response()->json([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', 'string', 'min:8'],
            'password_confirmation' => ['required', 'string'],
        ]);

        $status = Password::broker()->reset(
            [
                'email' => strtolower(trim($data['email'])),
                'password' => $data['password'],
                'password_confirmation' => $data['password_confirmation'],
                'token' => $data['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Password has been reset.',
        ]);
    }

    private function resolvePreferredLanguage(?string $language): string
    {
        $lang = strtolower(trim((string) $language));

        return in_array($lang, ['en', 'fr'], true) ? $lang : PlatformSetting::defaultLanguage();
    }

    private function formatAuthUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'affiliation_type' => $user->affiliation_type,
            'preferred_language' => $user->preferred_language,
            'initials' => $user->initials(),
            'has_avatar' => false,
            'avatar_url' => null,
            'school' => $user->school?->only(['id', 'name', 'city']),
            'school_board' => $user->school_board,
            'subscription' => [
                'status' => $user->subscription_status,
                'plan' => $user->subscription_plan,
                'billing' => $user->subscription_billing,
                'trial_ends_at' => $user->trial_ends_at?->toIso8601String(),
                'trial_days_remaining' => $user->trialDaysRemaining(),
                'is_trial_active' => $user->hasActiveTrial(),
                'is_active' => $user->hasActiveSubscription(),
                'can_access_classroom' => $user->canAccessClassroomFeatures(),
                'can_access_reports' => $user->canAccessReports(),
            ],
        ];
    }
}
