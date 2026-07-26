<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherClassroomAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'teacher') {
            return new JsonResponse(['message' => 'Teacher portal access required.'], 403);
        }

        if (! $user->canAccessClassroomFeatures()) {
            return new JsonResponse([
                'message' => 'This feature requires the Insights plan.',
                'upgrade_required' => true,
            ], 403);
        }

        return $next($request);
    }
}
