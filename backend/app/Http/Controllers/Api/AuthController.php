<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\InstitutionalSubscriptionService;
use App\Services\ResourceAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'portal' => ['sometimes', 'in:teacher,school,admin,board'],
        ]);

        $portal = $credentials['portal'] ?? null;
        $login = trim($credentials['email']);

        if ($portal === 'admin' && ! str_contains($login, '@')) {
            $login = "{$login}@portal.local";
        }

        if (! Auth::attempt(
            ['email' => $login, 'password' => $credentials['password']],
            $request->boolean('remember')
        )) {
            AuditLogger::loginFailure($request, $portal ?? 'unknown', $login);

            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        $portal = $credentials['portal'] ?? null;

        if ($portal === 'admin') {
            if ($user->role !== 'admin') {
                AuditLogger::log('Login', 'Authentication', "Access denied — admin portal — {$login}", 'warning', $request, user: $user, portal: 'admin');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail administrateur.'],
                ]);
            }

            AuditLogger::loginSuccess($request, $user, 'admin');

            return response()->json([
                'user' => $this->formatUser($user),
            ]);
        }

        if ($portal === 'teacher' && $user->role !== 'teacher') {
            AuditLogger::log('Login', 'Authentication', "Access denied — teacher portal — {$login}", 'warning', $request, user: $user, portal: 'teacher');
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Ce compte n\'a pas accès au portail enseignant.'],
            ]);
        }

        if (in_array($user->role, ['teacher', 'school_admin', 'board_admin'], true) && $user->account_status === 'inactive') {
            AuditLogger::log('Login', 'Authentication', "Access denied — inactive account — {$login}", 'warning', $request, user: $user, portal: $portal ?? $user->role);
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Veuillez activer votre compte via le lien reçu par courriel avant de vous connecter.'],
            ]);
        }

        if ($user->role === 'teacher' && $user->account_status === 'archived') {
            AuditLogger::log('Login', 'Authentication', "Access denied — archived account — {$login}", 'warning', $request, user: $user, portal: $portal ?? 'teacher');
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Ce compte est archivé.'],
            ]);
        }

        if ($portal === 'school') {
            if ($user->role !== 'school_admin') {
                AuditLogger::log('Login', 'Authentication', "Access denied — school portal — {$login}", 'warning', $request, user: $user, portal: 'school');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail école.'],
                ]);
            }

            $user->loadMissing('school');

            if ($user->account_status === 'archived') {
                AuditLogger::log('Login', 'Authentication', "Access denied — archived account — {$login}", 'warning', $request, user: $user, portal: 'school');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte est archivé.'],
                ]);
            }

            if (! $user->school || $user->school->status === 'archived') {
                AuditLogger::log('Login', 'Authentication', "Access denied — archived school — {$login}", 'warning', $request, user: $user, portal: 'school');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Cette école est archivée ou introuvable.'],
                ]);
            }
        }

        if ($portal === 'board') {
            if ($user->role !== 'board_admin') {
                AuditLogger::log('Login', 'Authentication', "Access denied — board portal — {$login}", 'warning', $request, user: $user, portal: 'board');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail conseil scolaire.'],
                ]);
            }

            if ($user->account_status === 'archived') {
                AuditLogger::log('Login', 'Authentication', "Access denied — archived account — {$login}", 'warning', $request, user: $user, portal: 'board');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte est archivé.'],
                ]);
            }

            $board = SchoolBoard::query()
                ->where('code', $user->school_board)
                ->first();

            if (! $board || $board->status === 'archived') {
                AuditLogger::log('Login', 'Authentication', "Access denied — archived board — {$login}", 'warning', $request, user: $user, portal: 'board');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce conseil scolaire est archivé ou introuvable.'],
                ]);
            }
        }

        if (! $portal && $user->role !== 'teacher' && $user->role !== 'school_admin' && $user->role !== 'board_admin' && $user->role !== 'admin') {
            AuditLogger::log('Login', 'Authentication', "Access denied — invalid role — {$login}", 'warning', $request, user: $user);
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Ce portail est réservé aux enseignants et aux écoles.'],
            ]);
        }

        $resolvedPortal = $portal ?? match ($user->role) {
            'admin' => 'admin',
            'school_admin' => 'school',
            'board_admin' => 'board',
            default => 'teacher',
        };

        AuditLogger::loginSuccess($request, $user, $resolvedPortal);
        $user->markLogin();

        return response()->json([
            'user' => $this->formatUser($user->fresh()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user) {
            AuditLogger::logout($request, $user);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json(['user' => null]);
        }

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    private function formatUser(User $user): array
    {
        if ($user->role === 'teacher') {
            // Sync licence whenever the teacher is linked to a school/board institution.
            $shouldSyncLicence = $user->isInstitutionalTeacher()
                || (
                    $user->affiliation_type !== 'individual'
                    && (
                        $user->isRegistrationLicensedTeacher()
                        || $user->subscription_plan === 'institutional'
                        || $user->affiliation_type === 'institutional'
                        || $user->school_id
                        || trim((string) ($user->school_board ?? '')) !== ''
                    )
                );

            if ($shouldSyncLicence) {
                $sponsor = $user->institutionalSponsor();
                if ($sponsor) {
                    InstitutionalSubscriptionService::syncRegistrationCoverage($user, $sponsor);
                    $user->refresh();
                }
            } elseif ($user->account_status === 'active' && $user->affiliation_type === 'individual') {
                $user->startTrialIfNeeded();
                $user->refresh();
            }
        }

        $user->loadMissing('school');

        $isRegistrationLicensed = $user->role === 'teacher' && $user->isRegistrationLicensedTeacher();

        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'affiliation_type' => $user->affiliation_type,
            'registration_source' => $user->registration_source,
            'registration_source_label' => InstitutionalSubscriptionService::registrationSourceLabel($user->registration_source),
            'preferred_language' => $user->preferred_language,
            'initials' => $user->initials(),
            'has_avatar' => (bool) $user->avatar_path,
            'avatar_url' => $user->avatar_path ? $this->avatarUrlFor($user) : null,
            'school' => $user->school?->only(['id', 'name', 'city']),
            'school_board' => $user->school_board,
            'permissions' => PlatformSetting::permissions(),
            'resource_access' => ResourceAccessService::payloadForUser($user),
            'is_trial_only' => $user->isTrialOnlyAccount(),
            'account_activated_at' => ($user->email_verified_at ?? $user->created_at)?->toIso8601String(),
            'subscription' => in_array($user->role, ['teacher', 'school_admin', 'board_admin'], true) ? [
                'status' => $user->subscription_status,
                'plan' => $user->subscription_plan,
                'billing' => $user->subscription_billing,
                'access_mode' => $user->isInstitutionalAdmin()
                    ? InstitutionalSubscriptionService::accessMode($user)
                    : null,
                'trial_started_at' => $user->trial_started_at?->toIso8601String(),
                'trial_ends_at' => $user->trial_ends_at?->toIso8601String(),
                'trial_days_remaining' => $user->trialDaysRemaining(),
                'is_trial_active' => $user->hasActiveTrial(),
                'is_active' => $user->hasActiveSubscription() && $user->subscription_plan !== 'institutional',
                'is_registration_licensed' => $isRegistrationLicensed,
                'is_institutional' => $user->role === 'teacher' && $user->isInstitutionalTeacher(),
                'subscription_started_at' => $user->subscription_started_at?->toIso8601String(),
                'subscription_ends_at' => $user->subscription_ends_at?->toIso8601String(),
                'auto_renew' => (bool) ($user->subscription_auto_renew ?? true),
                'can_access_classroom' => $user->role === 'teacher' ? $user->canAccessClassroomFeatures() : false,
                'can_access_reports' => $user->role === 'teacher' ? $user->canAccessReports() : false,
                'can_access_portal' => $user->isInstitutionalAdmin()
                    ? $user->canAccessInstitutionalPortal()
                    : ($user->hasInstitutionalCoverage() || $user->hasActiveTrial() || $user->hasActiveSubscription()),
            ] : null,
        ];
    }

    private function avatarUrlFor(User $user): string
    {
        return match ($user->role) {
            'board_admin' => '/api/board/profile/avatar',
            'school_admin' => '/api/school/profile/avatar',
            default => '/api/teacher/profile/avatar',
        };
    }
}

