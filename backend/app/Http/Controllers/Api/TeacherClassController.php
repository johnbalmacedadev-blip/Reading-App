<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $classes = $teacher->classes()
            ->withCount('students')
            ->orderBy('name')
            ->get()
            ->map(fn (SchoolClass $class) => $this->formatClassSummary($class));

        return response()->json(['classes' => $classes]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade' => ['required', 'string', 'max:255'],
            'school_year' => ['nullable', 'string', 'max:20'],
        ]);

        $class = SchoolClass::create([
            'teacher_id' => $teacher->id,
            'school_id' => $teacher->school_id,
            'name' => $data['name'],
            'grade' => $data['grade'],
            'school_year' => $data['school_year'] ?? '2025-2026',
        ]);

        return response()->json([
            'class' => $this->formatClassSummary($class->loadCount('students')),
        ], 201);
    }

    public function update(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade' => ['required', 'string', 'max:255'],
            'school_year' => ['nullable', 'string', 'max:20'],
        ]);

        $schoolClass->update([
            'name' => $data['name'],
            'grade' => $data['grade'],
            'school_year' => $data['school_year'] ?? $schoolClass->school_year,
        ]);

        return response()->json([
            'class' => $this->formatClassSummary($schoolClass->fresh()->loadCount('students')),
        ]);
    }

    public function show(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        $schoolClass->load(['students.evaluations' => function ($query) use ($schoolClass) {
            $query->where('class_id', $schoolClass->id);
        }]);

        return response()->json([
            'class' => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'grade' => $schoolClass->grade,
                'school_year' => $schoolClass->school_year,
                'student_count' => $schoolClass->students->count(),
                'students' => $schoolClass->students->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->fullName(),
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'evaluations' => $this->formatEvaluations($student, $schoolClass->id),
                ]),
            ],
        ]);
    }

    public function showStudent(Request $request, Student $student): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $class = $student->classes()
            ->where('teacher_id', $teacher->id)
            ->first();

        if (! $class) {
            abort(403);
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->fullName(),
                'class_id' => $class->id,
                'school_year' => $class->school_year,
            ],
        ]);
    }

    public function addStudent(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
        ]);

        $student = Student::create([
            'school_id' => $schoolClass->school_id,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
        ]);

        $schoolClass->students()->attach($student->id);

        for ($atelier = 1; $atelier <= 15; $atelier++) {
            StudentEvaluation::create([
                'student_id' => $student->id,
                'class_id' => $schoolClass->id,
                'atelier_number' => $atelier,
                'status' => null,
            ]);
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->fullName(),
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'evaluations' => array_fill(0, 15, null),
            ],
        ], 201);
    }

    private function authorizeClass(Request $request, SchoolClass $schoolClass): void
    {
        if ($schoolClass->teacher_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function formatClassSummary(SchoolClass $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'grade' => $class->grade,
            'school_year' => $class->school_year,
            'student_count' => $class->students_count ?? $class->students()->count(),
        ];
    }

    private function formatEvaluations(Student $student, int $classId): array
    {
        $byAtelier = $student->evaluations
            ->where('class_id', $classId)
            ->keyBy('atelier_number');

        $evaluations = [];
        for ($i = 1; $i <= 15; $i++) {
            $evaluations[] = $byAtelier->get($i)?->status;
        }

        return $evaluations;
    }
}
