<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Services\ResourceAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminResourceAccessController extends Controller
{
    public function catalog(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json(ResourceAccessService::catalog());
    }

    public function showTeacher(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless($teacher->role === 'teacher', 404);

        return response()->json([
            'grantee_type' => ResourceAccessService::TYPE_TEACHER,
            'grantee_id' => $teacher->id,
            'name' => trim(($teacher->first_name ?? '').' '.($teacher->last_name ?? '')) ?: $teacher->name,
            ...ResourceAccessService::show(ResourceAccessService::TYPE_TEACHER, $teacher->id),
            ...ResourceAccessService::catalog(),
        ]);
    }

    public function updateTeacher(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless($teacher->role === 'teacher', 404);

        $data = $this->validated($request);
        $saved = ResourceAccessService::save(
            ResourceAccessService::TYPE_TEACHER,
            $teacher->id,
            (bool) $data['enabled'],
            $data['items'] ?? [],
        );

        return response()->json([
            'message' => $saved['enabled'] ? 'Download permissions saved.' : 'Download permissions turned off.',
            'resource_access_enabled' => $saved['enabled'],
            ...$saved,
        ]);
    }

    public function showSchool(Request $request, School $school): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'grantee_type' => ResourceAccessService::TYPE_SCHOOL,
            'grantee_id' => $school->id,
            'name' => $school->name,
            ...ResourceAccessService::show(ResourceAccessService::TYPE_SCHOOL, $school->id),
            ...ResourceAccessService::catalog(),
        ]);
    }

    public function updateSchool(Request $request, School $school): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validated($request);
        $saved = ResourceAccessService::save(
            ResourceAccessService::TYPE_SCHOOL,
            $school->id,
            (bool) $data['enabled'],
            $data['items'] ?? [],
        );

        return response()->json([
            'message' => $saved['enabled'] ? 'Download permissions saved.' : 'Download permissions turned off.',
            'resource_access_enabled' => $saved['enabled'],
            ...$saved,
        ]);
    }

    /** @return array{enabled: bool, items?: list<array{kind?: string, resource_key?: string}>} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'enabled' => ['required', 'boolean'],
            'items' => ['sometimes', 'array'],
            'items.*.kind' => ['required_with:items', 'in:downloadable,export'],
            'items.*.resource_key' => ['required_with:items', 'string', 'max:80'],
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
