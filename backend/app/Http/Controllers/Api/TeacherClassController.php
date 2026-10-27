<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\ClassType;
use App\Models\PlatformSetting;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TeacherNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        return response()->json([
            'classes' => $classes,
            'class_types' => $this->formatClassTypes(),
            'student_limit' => $this->studentLimitFor($teacher),
        ]);
    }

    public function classTypes(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        return response()->json([
            'class_types' => $this->formatClassTypes(),
            'student_limit' => $this->studentLimitFor($teacher),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        $allowedGrades = ClassType::allowedGradeValues(true);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade' => ['required', 'string', 'max:255', Rule::in($allowedGrades)],
            'school_year' => ['required', 'string', 'max:20'],
        ]);

        $schoolYear = SchoolYear::normalizeLabel($data['school_year']);
        if (! SchoolYear::isValidSpan($schoolYear)) {
            return response()->json([
                'message' => 'Enter a valid school year (e.g. 2025 - 26).',
                'errors' => [
                    'school_year' => ['Enter a valid school year (e.g. 2025 - 26).'],
                ],
            ], 422);
        }

        $class = SchoolClass::create([
            'teacher_id' => $teacher->id,
            'school_id' => $teacher->school_id,
            'name' => $data['name'],
            'grade' => $data['grade'],
            'school_year' => $schoolYear,
        ]);

        AuditLogger::log('Create', 'Access', "Class {$class->name} created", 'info', $request, subject: $class);

        try {
            TeacherNotificationService::classCreated($teacher, $class);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'class' => $this->formatClassSummary($class->loadCount('students')),
        ], 201);
    }

    public function update(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        $allowedGrades = ClassType::allowedGradeValues(true);
        $allowedGrades[] = $schoolClass->grade;
        $allowedGrades = array_values(array_unique($allowedGrades));

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade' => ['required', 'string', 'max:255', Rule::in($allowedGrades)],
            'school_year' => ['required', 'string', 'max:20'],
        ]);

        $schoolYear = SchoolYear::normalizeLabel($data['school_year']);
        if (! SchoolYear::isValidSpan($schoolYear)) {
            return response()->json([
                'message' => 'Enter a valid school year (e.g. 2025 - 26).',
                'errors' => [
                    'school_year' => ['Enter a valid school year (e.g. 2025 - 26).'],
                ],
            ], 422);
        }

        $schoolClass->update([
            'name' => $data['name'],
            'grade' => $data['grade'],
            'school_year' => $schoolYear,
        ]);

        AuditLogger::log('Edit', 'Access', "Class {$schoolClass->name} updated", 'info', $request, subject: $schoolClass);

        return response()->json([
            'class' => $this->formatClassSummary($schoolClass->fresh()->loadCount('students')),
        ]);
    }

    public function destroy(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        if ($schoolClass->students()->count() > 0) {
            return response()->json([
                'message' => 'Classes with students cannot be deleted.',
            ], 422);
        }

        $name = $schoolClass->name;
        $schoolClass->evaluations()->delete();
        $schoolClass->delete();

        AuditLogger::log('Delete', 'Access', "Class {$name} deleted", 'warning', $request);

        return response()->json(['message' => 'Class deleted.']);
    }

    public function show(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->authorizeClass($request, $schoolClass);

        $schoolClass->load(['students.evaluations' => function ($query) use ($schoolClass) {
            $query->where('class_id', $schoolClass->id);
        }]);

        $publishedWorkshops = $this->publishedWorkshopsForGrade($schoolClass->grade);
        /** @var User $teacher */
        $teacher = $request->user();

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
            'student_limit' => $this->studentLimitFor($teacher),
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
                'has_activity' => $this->studentHasActivity($student->id, $class->id),
                'evaluations' => $evaluations,
            ],
        ]);
    }

    public function destroyStudent(Request $request, Student $student): JsonResponse
    {
        PlatformSetting::assertPermission('teacher_can_edit_student', true);

        /** @var User $teacher */
        $teacher = $request->user();

        $classId = $request->integer('class_id');
        $classQuery = $student->classes()->where('teacher_id', $teacher->id);
        $class = $classId > 0
            ? (clone $classQuery)->where('classes.id', $classId)->first()
            : $classQuery->first();

        if (! $class) {
            abort(403);
        }

        if ($this->studentHasActivity($student->id, $class->id)) {
            return response()->json([
                'message' => 'Students with evaluation activity cannot be deleted.',
            ], 422);
        }

        $name = $student->fullName();

        StudentEvaluation::query()
            ->where('student_id', $student->id)
            ->where('class_id', $class->id)
            ->delete();

        $student->classes()->detach($class->id);

        if ($student->classes()->count() === 0) {
            $student->evaluations()->delete();
            $student->delete();
        }

        AuditLogger::log(
            'Delete',
            'Student',
            "{$name} removed from class {$class->name}",
            'warning',
            $request,
        );

        return response()->json([
            'message' => 'Student deleted.',
            'class_id' => $class->id,
        ]);
    }

    public function addStudent(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        PlatformSetting::assertPermission('teacher_can_edit_student', true);

        $this->authorizeClass($request, $schoolClass);

        /** @var User $teacher */
        $teacher = $request->user();
        $limit = $this->studentLimitFor($teacher);

        if (! $limit['can_add']) {
            return response()->json([
                'message' => "Student limit reached. A teacher can add at most {$limit['max']} students across all classes.",
                'student_limit' => $limit,
            ], 422);
        }

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
        try {
            TeacherNotificationService::studentAdded($teacher, $schoolClass, $student);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->fullName(),
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'evaluations' => array_fill(0, 15, null),
            ],
            'student_limit' => $this->studentLimitFor($teacher),
        ], 201);
    }

    private function authorizeClass(Request $request, SchoolClass $schoolClass): void
    {
        if ($schoolClass->teacher_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function studentHasActivity(int $studentId, int $classId): bool
    {
        return StudentEvaluation::query()
            ->where('student_id', $studentId)
            ->where('class_id', $classId)
            ->get()
            ->contains(function (StudentEvaluation $evaluation) {
                if ($evaluation->not_required) {
                    return true;
                }

                if ($evaluation->status !== null && $evaluation->status !== '') {
                    return true;
                }

                $responses = $evaluation->responses;

                return $responses !== null && $responses !== [];
            });
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
        $normalizedGrade = ClassType::resolveAssessmentGrade($grade);

        $publishedAteliers = Assessment::query()
            ->whereNull('school_board')
            ->whereNull('archived_at')
            ->where(function ($q) use ($grade, $normalizedGrade) {
                $q->where('grade', $grade)
                    ->orWhere('grade', $normalizedGrade)
                    ->orWhere('grade', 'All');
            })
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

    /** @return list<array{code: string, name: string, name_fr: string|null, assessment_grade: string}> */
    private function formatClassTypes(): array
    {
        return ClassType::activeOrdered()
            ->get()
            ->map(fn (ClassType $type) => [
                'code' => $type->code,
                'name' => $type->name,
                'name_fr' => $type->name_fr,
                'assessment_grade' => $type->assessment_grade,
            ])
            ->values()
            ->all();
    }

    /** @return array{max: int|null, used: int, remaining: int|null, can_add: bool, unlimited: bool} */
    private function studentLimitFor(User $teacher): array
    {
        $used = $this->countTeacherStudents($teacher);

        // Insights subscription has no student cap. Free (trial/none) and Essentials are limited.
        if ($teacher->hasActiveSubscription() && $teacher->subscription_plan === 'insights') {
            return [
                'max' => null,
                'used' => $used,
                'remaining' => null,
                'can_add' => true,
                'unlimited' => true,
            ];
        }

        $max = PlatformSetting::maxStudentsPerTeacher();
        $remaining = max(0, $max - $used);

        return [
            'max' => $max,
            'used' => $used,
            'remaining' => $remaining,
            'can_add' => $remaining > 0,
            'unlimited' => false,
        ];
    }

    private function countTeacherStudents(User $teacher): int
    {
        return Student::query()
            ->whereHas('classes', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->count();
    }
}
