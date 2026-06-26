<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminTeacherController extends Controller
{
    private const BOARDS = ['CSDM', 'CSDN', 'CSMB', 'CSPO'];

    private const STATUSES = ['active', 'inactive', 'archived'];

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'teacher')
            ->with('school')
            ->withCount('classes')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('school') && $request->string('school')->toString() !== 'All Schools') {
            $schoolName = $request->string('school')->toString();
            $query->whereHas('school', fn ($q) => $q->where('name', $schoolName));
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('account_status', $this->parseStatus($request->string('status')->toString()));
        }

        return response()->json([
            'teachers' => $query->get()->map(fn (User $teacher) => $this->format($teacher)),
        ]);
    }

    public function schools(): JsonResponse
    {
        return response()->json([
            'schools' => School::query()->orderBy('name')->get(['id', 'name', 'city']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $teacher = User::create([
            ...$data,
            'name' => $this->buildName($data),
            'role' => 'teacher',
            'password' => Hash::make('password'),
        ]);

        $teacher->load('school')->loadCount('classes');

        return response()->json(['teacher' => $this->format($teacher)], 201);
    }

    public function update(Request $request, User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $data = $this->validated($request, $teacher->id);
        $data['name'] = $this->buildName($data);

        $teacher->update($data);
        $teacher->load('school')->loadCount('classes');

        return response()->json(['teacher' => $this->format($teacher)]);
    }

    public function archive(User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $teacher->update([
            'account_status' => $teacher->account_status === 'archived' ? 'active' : 'archived',
        ]);

        $teacher->load('school')->loadCount('classes');

        return response()->json(['teacher' => $this->format($teacher)]);
    }

    private function validated(Request $request, ?int $ignoreUserId = null): array
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($ignoreUserId),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'school_id' => ['required', 'exists:schools,id'],
            'school_board' => ['required', 'string', 'in:'.implode(',', self::BOARDS)],
            'account_status' => ['required', 'string'],
            'started_at' => ['nullable', 'date'],
        ]);

        $data['account_status'] = $this->parseStatus($data['account_status']);

        return $data;
    }

    private function buildName(array $data): string
    {
        $parts = array_filter([
            $data['title'] ?? null,
            $data['first_name'],
            $data['last_name'],
        ]);

        return implode(' ', $parts);
    }

    private function parseStatus(string $status): string
    {
        return match (strtolower($status)) {
            'active' => 'active',
            'inactive' => 'inactive',
            'archived' => 'archived',
            default => 'active',
        };
    }

    private function displayStatus(?string $status): string
    {
        return match ($status) {
            'inactive' => 'Inactive',
            'archived' => 'Archived',
            default => 'Active',
        };
    }

    private function format(User $teacher): array
    {
        return [
            'id' => $teacher->id,
            'name' => $this->formattedName($teacher),
            'title' => $teacher->title ?? '',
            'first_name' => $teacher->first_name ?? '',
            'last_name' => $teacher->last_name ?? '',
            'email' => $teacher->email,
            'phone' => $teacher->phone ?? '',
            'school' => $teacher->school?->name ?? '',
            'school_id' => $teacher->school_id,
            'board' => $teacher->school_board ?? '',
            'classes' => $teacher->classes_count ?? 0,
            'status' => $this->displayStatus($teacher->account_status),
            'since' => $teacher->started_at?->format('Y-m-d') ?? '',
        ];
    }

    private function formattedName(User $teacher): string
    {
        if ($teacher->first_name) {
            $parts = array_filter([$teacher->title, $teacher->first_name, $teacher->last_name]);

            return implode(' ', $parts);
        }

        return $teacher->name;
    }
}
