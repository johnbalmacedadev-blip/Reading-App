<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherClassController extends Controller
{
    /** @var array<string, string> */
    private const GRADE_ALIASES = [
        'Maternelle' => 'Kindergarten',
        'Jardin' => 'Kindergarten',
        '1re année' => 'Grade 1',
        '2e année' => 'Grade 2',
        '3e année' => 'Grade 3',
        '4e année' => 'Grade 3+',
        '5e année' => 'Grade 3+',
        '6e année' => 'Grade 3+',
        'Grade 4' => 'Grade 3+',
        'Grade 5' => 'Grade 3+',
        'Grade 6' => 'Grade 3+',
    ];

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
            'school_year' => $data['school_year'] ?? SchoolYear::defaultLabel(),
        ]);

        AuditLogger::log('Create', 'Access', "Class {$class->name} created", 'info', $request, subject: $class);

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

        AuditLogger::log('Edit', 'Access', "Class {$schoolClass->name} updated", 'info', $request, subject: $schoolClass);

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

        $publishedWorkshops = $this->publishedWorkshopsForGrade($schoolClass->grade);

        return response()->json([
            'class' => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'grade' => $schoolClass->grade,
                'school_year' => $schoolClass->school_year,
                'student_count' => $schoolClass->students->count(),
                'published_workshops' => $publishedWorkshops,
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

        $classQuery = $student->classes()
            ->with('teacher')
            ->where('teacher_id', $teacher->id);

        $classId = $request->integer('class_id');
        $class = $classId > 0
            ? (clone $classQuery)->where('classes.id', $classId)->first()
            : $classQuery->first();

        if (! $class) {
            abort(403);
        }

        $evaluations = StudentEvaluation::query()
            ->where('student_id', $student->id)
            ->where('class_id', $class->id)
            ->whereNotNull('status')
            ->orderBy('atelier_number')
            ->get()
            ->map(fn (StudentEvaluation $evaluation) => [
                'number' => $evaluation->atelier_number,
                'status' => $evaluation->status,
                'comment' => $evaluation->comment,
                'date' => $evaluation->updated_at?->format('Y-m-d'),
                'not_required' => (bool) $evaluation->not_required,
            ])
            ->values()
            ->all();

        $teacherUser = $class->teacher;
        $teacherDisplay = $teacherUser?->first_name
            ? 'Mme '.$teacherUser->first_name
            : ($teacherUser?->name ?? $class->name);

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->fullName(),
                'grade' => $class->grade,
                'class_id' => $class->id,
                'class_name' => $class->name,
                'teacher_display' => $teacherDisplay,
                'school_year' => $class->school_year,
                'evaluations' => $evaluations,
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

        AuditLogger::log('Create', 'Student', "{$student->fullName()} added to class {$schoolClass->name}", 'info', $request, subject: $student);

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
            $evaluations[] = $this->resolveDisplayStatus($byAtelier->get($i));
        }

        return $evaluations;
    }

    private function resolveDisplayStatus(?StudentEvaluation $evaluation): ?string
    {
        if (! $evaluation) {
            return null;
        }

        if ($evaluation->not_required) {
            return 'not-required';
        }

        $responses = $evaluation->responses;
        if ($responses === null || $responses === []) {
            return null;
        }

        return $evaluation->status;
    }

    /** @return array<int, bool> */
    private function publishedWorkshopsForGrade(string $grade): array
    {
        $normalizedGrade = self::GRADE_ALIASES[$grade] ?? $grade;

        $publishedAteliers = Assessment::query()
            ->whereNull('school_board')
            ->whereNull('archived_at')
            ->where('grade', $normalizedGrade)
            ->where('status', 'published')
            ->whereNotNull('template_id')
            ->pluck('atelier')
            ->unique()
            ->all();

        $publishedLookup = array_fill(1, 15, false);
        foreach ($publishedAteliers as $atelier) {
            if ($atelier >= 1 && $atelier <= 15) {
                $publishedLookup[$atelier] = true;
            }
        }

        return array_values($publishedLookup);
    }
}
