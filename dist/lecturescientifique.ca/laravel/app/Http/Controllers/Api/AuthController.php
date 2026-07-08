<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolBoard;
use App\Models\User;
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
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail administrateur.'],
                ]);
            }

            return response()->json([
                'user' => $this->formatUser($user),
            ]);
        }

        if ($portal === 'teacher' && $user->role !== 'teacher') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Ce compte n\'a pas accès au portail enseignant.'],
            ]);
        }

        if ($portal === 'school') {
            if ($user->role !== 'school_admin') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail école.'],
                ]);
            }

            $user->loadMissing('school');

            if ($user->account_status === 'archived') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte est archivé.'],
                ]);
            }

            if (! $user->school || $user->school->status === 'archived') {
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
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce compte n\'a pas accès au portail conseil scolaire.'],
                ]);
            }

            if ($user->account_status === 'archived') {
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
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => ['Ce conseil scolaire est archivé ou introuvable.'],
                ]);
            }
        }

        if (! $portal && $user->role !== 'teacher' && $user->role !== 'school_admin' && $user->role !== 'board_admin' && $user->role !== 'admin') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => ['Ce portail est réservé aux enseignants et aux écoles.'],
            ]);
        }

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
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
        $user->loadMissing('school');

        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'initials' => $user->initials(),
            'has_avatar' => (bool) $user->avatar_path,
            'avatar_url' => $user->avatar_path ? '/api/teacher/profile/avatar' : null,
            'school' => $user->school?->only(['id', 'name', 'city']),
            'school_board' => $user->school_board,
        ];
    }
}
