<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    /** @var array<string, string> */
    private const ROLE_LABELS = [
        'admin' => 'Administrator',
        'teacher' => 'Teacher',
        'school_admin' => 'School Administrator',
        'board_admin' => 'Board Administrator',
    ];

    /** @var array<string, string> */
    private const PORTAL_BY_ROLE = [
        'admin' => 'admin',
        'teacher' => 'teacher',
        'school_admin' => 'school',
        'board_admin' => 'board',
    ];

    public static function log(
        string $action,
        string $category,
        string $target,
        string $severity = 'info',
        ?Request $request = null,
        ?User $user = null,
        ?string $portal = null,
        ?Model $subject = null,
        ?array $metadata = null,
        ?string $userName = null,
    ): AuditLog {
        $resolvedUser = $user ?? ($request ? $request->user() : null) ?? Auth::user();
        $role = $resolvedUser?->role;
        $resolvedPortal = $portal ?? ($role ? (self::PORTAL_BY_ROLE[$role] ?? null) : null);
        $resolvedName = $userName ?? ($resolvedUser?->displayName() ?? 'Unknown');
        $roleLabel = $role ? (self::ROLE_LABELS[$role] ?? ucfirst(str_replace('_', ' ', $role))) : '—';

        if ($resolvedName === 'System') {
            $roleLabel = 'Automatic';
        }

        return AuditLog::query()->create([
            'user_id' => $resolvedUser?->id,
            'user_name' => $resolvedName,
            'user_role' => $role,
            'role_label' => $roleLabel,
            'action' => $action,
            'category' => $category,
            'target' => $target,
            'ip_address' => $request?->ip(),
            'severity' => $severity,
            'portal' => $resolvedPortal,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata,
        ]);
    }

    public static function loginSuccess(Request $request, User $user, string $portal): AuditLog
    {
        return self::log(
            action: 'Login',
            category: 'Authentication',
            target: "Successful login — {$portal} portal",
            severity: 'info',
            request: $request,
            user: $user,
            portal: $portal,
        );
    }

    public static function loginFailure(Request $request, string $portal, ?string $identifier = null): AuditLog
    {
        $label = $identifier ? "Failed login attempt — {$identifier}" : 'Failed login attempt';

        return self::log(
            action: 'Login',
            category: 'Authentication',
            target: $label,
            severity: 'critical',
            request: $request,
            user: null,
            portal: $portal,
            userName: 'Unknown',
        );
    }

    public static function logout(Request $request, User $user): AuditLog
    {
        $portal = self::PORTAL_BY_ROLE[$user->role] ?? 'unknown';

        return self::log(
            action: 'Login',
            category: 'Authentication',
            target: "Logout — {$portal} portal",
            severity: 'info',
            request: $request,
            user: $user,
            portal: $portal,
        );
    }

    public static function export(Request $request, string $category, string $target, ?User $user = null): AuditLog
    {
        return self::log(
            action: 'Export',
            category: $category,
            target: $target,
            severity: 'info',
            request: $request,
            user: $user,
        );
    }
}
