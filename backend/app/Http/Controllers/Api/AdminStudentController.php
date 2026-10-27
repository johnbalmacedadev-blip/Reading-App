<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassType;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminStudentController extends Controller
{
    private const ASSESSMENT_GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 3+'];

    /** Workshops a student is expected to have completed by the end of the grade. */
    private const GRADE_TARGETS = [
        'Kindergarten' => 2,
        'Grade 1' => 6,
        'Grade 2' => 10,
        'Grade 3' => 14,
        'Grade 3+' => 14,
    ];

    private const STATUSES = ['on_track', 'monitor', 'at_risk'];

    /** @var array<string, int>|null Grade label => workshop target, resolved once per request. */
    private ?array $targetsByGrade = null;

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
        $boardNames = SchoolBoard::query()->pluck('name', 'code');

        $schools = School::query()
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'school_board'])
            ->map(fn (School $school) => [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city,
                'board_code' => $school->school_board,
                'board' => $school->school_board
                    ? ($boardNames[$school->school_board] ?? $school->school_board)
                    : '',
            ]);

        return response()->json([
            'schools' => $schools,
            'grades' => $this->gradeOptions(),
        ]);
    }

    public function teachers(Request $request): JsonResponse
    {
        $search = trim($request->string('search')->toString());

        $query = User::query()
            ->where('role', 'teacher')
            ->with('school:id,name')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(15);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $boardNames = SchoolBoard::query()->pluck('name', 'code');

        return response()->json([
            'teachers' => $query->get()->map(fn (User $teacher) => [
                'id' => $teacher->id,
                'name' => trim($teacher->name ?: trim("{$teacher->first_name} {$teacher->last_name}")),
                'email' => $teacher->email,
                'school_id' => $teacher->school_id,
                'school' => $teacher->school?->name ?? '',
                'board_code' => $teacher->school_board,
                'board' => $teacher->school_board
                    ? ($boardNames[$teacher->school_board] ?? $teacher->school_board)
                    : '',
            ])->values(),
        ]);
    }

    /**
     * Grade levels come from the class types configured in the database so the admin
     * form always mirrors what teachers can actually assign to a class.
     *
     * @return list<array<string, mixed>>
     */
    private function gradeOptions(): array
    {
        return ClassType::activeOrdered()
            ->get()
            ->map(fn (ClassType $type) => [
                'value' => $type->name,
                'label' => $type->name,
                'label_fr' => $type->name_fr ?: $type->name,
                'assessment_grade' => $type->assessment_grade,
                'target' => self::GRADE_TARGETS[$type->assessment_grade] ?? 14,
            ])
            ->values()
            ->all();
    }

    private function targetFor(?string $grade): int
    {
        if ($this->targetsByGrade === null) {
            $map = self::GRADE_TARGETS;

            foreach (ClassType::query()->get() as $type) {
                $target = self::GRADE_TARGETS[$type->assessment_grade] ?? 14;
                foreach (array_filter([$type->name, $type->name_fr, $type->code]) as $label) {
                    $map[$label] = $target;
                }
            }

            foreach (['Maternelle' => 'Kindergarten', 'Jardin' => 'Kindergarten', '1re année' => 'Grade 1',
                '2e année' => 'Grade 2', '3e année' => 'Grade 3', '3e année+' => 'Grade 3+'] as $label => $assessment) {
                $map[$label] ??= self::GRADE_TARGETS[$assessment];
            }

            $this->targetsByGrade = $map;
        }

        return $this->targetsByGrade[$grade ?? ''] ?? 14;
    }

    /** @return list<string> */
    private function allowedGrades(): array
    {
        $legacy = [
            'Maternelle', 'Jardin', 'JK', 'SK',
            '1re année', '2e année', '3e année', '3e année+',
            '4e année', '5e année', '6e année',
            'Grade 4', 'Grade 5', 'Grade 6',
        ];

        return array_values(array_unique(array_merge(
            ClassType::allowedGradeValues(false),
            self::ASSESSMENT_GRADES,
            $legacy,
        )));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $student = Student::create($data);
        $student->load('school');

        AuditLogger::log('Create', 'Student', "{$student->fullName()} created", 'info', $request, subject: $student);

        return response()->json(['student' => $this->format($student)], 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $this->validated($request);

        $student->update($data);
        $student->load('school');

        AuditLogger::log('Edit', 'Student', "{$student->fullName()} updated", 'info', $request, subject: $student);

        return response()->json(['student' => $this->format($student)]);
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $name = $student->fullName();
        $student->evaluations()->delete();
        $student->classes()->detach();
        $student->delete();

        AuditLogger::log('Delete', 'Student', "{$name} deleted", 'warning', $request);

        return response()->json(['message' => 'Student record deleted.']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'grade' => ['required', 'string', Rule::in($this->allowedGrades())],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'teacher_name' => ['nullable', 'string', 'max:255'],
            'current_atelier' => ['required', 'integer', 'min:1', 'max:15'],
            'status' => ['required', 'string'],
        ]);

        $data['school_id'] = $data['school_id'] ?? null;
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
            'target' => $this->targetFor($student->grade),
            'school' => $student->school?->name ?? '',
            'school_id' => $student->school_id,
            'teacher' => $student->teacher_name ?? '',
            'atelier' => $student->current_atelier ?? 1,
            'status' => $this->displayStatus($student->status),
            'dob' => $student->date_of_birth?->format('Y-m-d') ?? '',
        ];
    }
}
