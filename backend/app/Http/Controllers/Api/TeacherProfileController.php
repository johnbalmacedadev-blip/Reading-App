<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\EmailLocale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();
        $teacher->load('school');

        return response()->json([
            'profile' => $this->formatProfile($teacher),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($teacher->id),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'preferred_language' => ['sometimes', 'in:en,fr'],
            'current_password' => ['required_with:password', 'nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($data['password'])) {
            if (empty($data['current_password']) || ! Hash::check($data['current_password'], $teacher->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Le mot de passe actuel est incorrect.'],
                ]);
            }

            $teacher->password = $data['password'];
            $teacher->portal_password_encrypted = Crypt::encryptString($data['password']);
        }

        $fill = [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'name' => trim("{$data['first_name']} {$data['last_name']}"),
        ];

        if (array_key_exists('preferred_language', $data)) {
            $fill['preferred_language'] = $data['preferred_language'];
        }

        $teacher->fill($fill);
        $teacher->save();
        $teacher->load('school');

        AuditLogger::log('Edit', 'Teacher', "{$teacher->displayName()} profile updated", 'info', $request, subject: $teacher);

        return response()->json([
            'profile' => $this->formatProfile($teacher),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $request->validate([
            'avatar' => ['required', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        if ($teacher->avatar_path && Storage::disk('public')->exists($teacher->avatar_path)) {
            Storage::disk('public')->delete($teacher->avatar_path);
        }

        $file = $request->file('avatar');
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->storeAs('avatars', Str::uuid().'.'.$extension, 'public');

        $teacher->avatar_path = $path;
        $teacher->save();
        $teacher->load('school');

        AuditLogger::log('Upload', 'Teacher', "{$teacher->displayName()} avatar uploaded", 'info', $request, subject: $teacher);

        return response()->json([
            'profile' => $this->formatProfile($teacher),
        ]);
    }

    public function showAvatar(Request $request): StreamedResponse|JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        if (! $teacher->avatar_path || ! Storage::disk('public')->exists($teacher->avatar_path)) {
            return response()->json(['message' => 'Avatar not found.'], 404);
        }

        $extension = strtolower(pathinfo($teacher->avatar_path, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return Storage::disk('public')->response($teacher->avatar_path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function formatProfile(User $teacher): array
    {
        $classes = $teacher->classes()->withCount('students')->orderBy('name')->get();
        $gradesTaught = $classes
            ->pluck('grade')
            ->filter(fn ($grade) => filled($grade))
            ->unique()
            ->values()
            ->all();

        return [
            'id' => $teacher->id,
            'first_name' => $teacher->first_name,
            'last_name' => $teacher->last_name,
            'email' => $teacher->email,
            'phone' => $teacher->phone,
            'role' => $teacher->role,
            'initials' => $teacher->initials(),
            'has_avatar' => (bool) $teacher->avatar_path,
            'avatar_url' => $teacher->avatar_path ? '/api/teacher/profile/avatar' : null,
            'school' => $teacher->school?->only(['id', 'name', 'city']),
            'school_board' => $this->formatSchoolBoard($teacher),
            'started_at' => $teacher->started_at?->format('Y-m-d'),
            'started_at_label' => $this->formatStartedAt($teacher),
            'preferred_language' => EmailLocale::resolve($teacher),
            'grade_taught' => $gradesTaught !== [] ? implode(', ', $gradesTaught) : null,
            'grades_taught' => $gradesTaught,
            'class_count' => $classes->count(),
            'student_count' => (int) $classes->sum('students_count'),
        ];
    }

    private function formatStartedAt(User $teacher): ?string
    {
        if (! $teacher->started_at) {
            return null;
        }

        $month = $teacher->started_at->translatedFormat('F');
        $year = $teacher->started_at->format('Y');

        return "{$month} {$year}";
    }

    private function formatSchoolBoard(User $teacher): ?array
    {
        $code = $teacher->school_board ?: $teacher->school?->school_board;

        if (! $code) {
            return null;
        }

        $board = SchoolBoard::query()->where('code', $code)->first();

        return [
            'code' => $code,
            'name' => $board?->name ?? $code,
        ];
    }
}
