<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BoardProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $this->boardUser($request);

        return response()->json([
            'profile' => $this->formatProfile($user),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->boardUser($request);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'current_password' => ['required_with:password', 'nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($data['password'])) {
            if (empty($data['current_password']) || ! Hash::check($data['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Le mot de passe actuel est incorrect.'],
                ]);
            }

            $user->password = $data['password'];
            $user->portal_password_encrypted = Crypt::encryptString($data['password']);
        }

        $user->fill([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'name' => trim("{$data['first_name']} {$data['last_name']}"),
        ]);
        $user->save();

        AuditLogger::log('Edit', 'Board', "{$user->displayName()} profile updated", 'info', $request, subject: $user);

        return response()->json([
            'profile' => $this->formatProfile($user->fresh()),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $this->boardUser($request);

        $request->validate([
            'avatar' => ['required', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $file = $request->file('avatar');
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->storeAs('avatars', Str::uuid().'.'.$extension, 'public');

        $user->avatar_path = $path;
        $user->save();

        AuditLogger::log('Upload', 'Board', "{$user->displayName()} avatar uploaded", 'info', $request, subject: $user);

        return response()->json([
            'profile' => $this->formatProfile($user),
        ]);
    }

    public function showAvatar(Request $request): StreamedResponse|JsonResponse
    {
        $user = $this->boardUser($request);

        if (! $user->avatar_path || ! Storage::disk('public')->exists($user->avatar_path)) {
            return response()->json(['message' => 'Avatar not found.'], 404);
        }

        $extension = strtolower(pathinfo($user->avatar_path, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return Storage::disk('public')->response($user->avatar_path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function boardUser(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        return $user;
    }

    private function formatProfile(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->displayName(),
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'initials' => $user->initials(),
            'has_avatar' => (bool) $user->avatar_path,
            'avatar_url' => $user->avatar_path ? '/api/board/profile/avatar' : null,
            'school_board' => $this->formatSchoolBoard($user),
            'started_at' => $user->started_at?->format('Y-m-d'),
            'started_at_label' => $this->formatStartedAt($user),
        ];
    }

    private function formatSchoolBoard(User $user): ?array
    {
        if (! $user->school_board) {
            return null;
        }

        $board = SchoolBoard::query()->where('code', $user->school_board)->first();

        return [
            'code' => $user->school_board,
            'name' => $board?->name ?? $user->school_board,
        ];
    }

    private function formatStartedAt(User $user): ?string
    {
        if (! $user->started_at) {
            return null;
        }

        $month = $user->started_at->translatedFormat('F');
        $year = $user->started_at->format('Y');

        return "{$month} {$year}";
    }
}
