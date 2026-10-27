<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureInstitutionalEntitled
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== $role) {
            return new JsonResponse([
                'message' => $role === 'board_admin'
                    ? 'School board portal access required.'
                    : 'School portal access required.',
            ], 403);
        }

        if (in_array($user->account_status, ['inactive', 'archived'], true)) {
            return new JsonResponse([
                'message' => 'This portal account is not active.',
                'account_deactivated' => true,
            ], 403);
        }

        if (! $user->canAccessInstitutionalPortal()) {
            return new JsonResponse([
                'message' => 'Your trial or subscription has ended. Contact Lecture Scientifique to renew access.',
                'subscription_required' => true,
            ], 402);
        }

        return $next($request);
    }
}