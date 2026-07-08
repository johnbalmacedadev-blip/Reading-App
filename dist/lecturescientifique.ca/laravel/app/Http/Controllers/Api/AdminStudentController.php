<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStudentController extends Controller
{
    private const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

    private const STATUSES = ['on_track', 'monitor', 'at_risk'];

    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->with('school')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereHas('school', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('grade') && $request->string('grade')->toString() !== 'All Grades') {
            $query->where('grade', $request->string('grade')->toString());
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', $this->parseStatus($request->string('status')->toString()));
        }

        return response()->json([
            'students' => $query->get()->map(fn (Student $student) => $this->format($student)),
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

        $student = Student::create($data);
        $student->load('school');

        return response()->json(['student' => $this->format($student)], 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $this->validated($request);

        $student->update($data);
        $student->load('school');

        return response()->json(['student' => $this->format($student)]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $student->evaluations()->delete();
        $student->classes()->detach();
        $student->delete();

        return response()->json(['message' => 'Student record deleted.']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'grade' => ['required', 'string', 'in:'.implode(',', self::GRADES)],
            'school_id' => ['required', 'exists:schools,id'],
            'teacher_name' => ['nullable', 'string', 'max:255'],
            'current_atelier' => ['required', 'integer', 'min:1', 'max:15'],
            'status' => ['required', 'string'],
        ]);

        $data['status'] = $this->parseStatus($data['status']);

        return $data;
    }

    private function parseStatus(string $status): string
    {
        return match ($status) {
            'On Track', 'on_track', 'En voie' => 'on_track',
            'Monitor', 'monitor', 'À surveiller' => 'monitor',
            'At Risk', 'at_risk', 'À risque' => 'at_risk',
            default => in_array($status, self::STATUSES, true) ? $status : 'on_track',
        };
    }

    private function displayStatus(?string $status): string
    {
        return match ($status) {
            'on_track' => 'On Track',
            'monitor' => 'Monitor',
            'at_risk' => 'At Risk',
            default => 'On Track',
        };
    }

    private function format(Student $student): array
    {
        return [
            'id' => $student->id,
            'name' => $student->fullName(),
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'grade' => $student->grade ?? '',
            'school' => $student->school?->name ?? '',
            'school_id' => $student->school_id,
            'teacher' => $student->teacher_name ?? '',
            'atelier' => $student->current_atelier ?? 1,
            'status' => $this->displayStatus($student->status),
            'dob' => $student->date_of_birth?->format('Y-m-d') ?? '',
        ];
    }
}
