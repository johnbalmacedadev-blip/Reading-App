<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassType;
use App\Models\PlatformSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminClassTypeController extends Controller
{
    private const ASSESSMENT_GRADES = [
        'Kindergarten',
        'Grade 1',
        'Grade 2',
        'Grade 3',
        'Grade 3+',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $types = ClassType::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ClassType $type) => $this->format($type));

        return response()->json([
            'class_types' => $types->values()->all(),
            'max_students_per_teacher' => PlatformSetting::maxStudentsPerTeacher(),
            'assessment_grades' => ClassType::assessmentGradeOptions(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validateType($request);

        $type = ClassType::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'name_fr' => $data['name_fr'] ?? null,
            'assessment_grade' => $data['assessment_grade'],
            'sort_order' => $data['sort_order'] ?? ((int) ClassType::query()->max('sort_order') + 1),
            'is_active' => $data['is_active'] ?? true,
        ]);

        AuditLogger::log('Create', 'Settings', "Class type {$type->name} created", 'info', $request, subject: $type);

        return response()->json(['class_type' => $this->format($type)], 201);
    }

    public function update(Request $request, ClassType $classType): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validateType($request, $classType->id);

        $classType->update([
            'code' => $data['code'],
            'name' => $data['name'],
            'name_fr' => $data['name_fr'] ?? null,
            'assessment_grade' => $data['assessment_grade'],
            'sort_order' => $data['sort_order'] ?? $classType->sort_order,
            'is_active' => $data['is_active'] ?? $classType->is_active,
        ]);

        AuditLogger::log('Edit', 'Settings', "Class type {$classType->name} updated", 'info', $request, subject: $classType);

        return response()->json(['class_type' => $this->format($classType->fresh())]);
    }

    public function destroy(Request $request, ClassType $classType): JsonResponse
    {
        $this->authorizeAdmin($request);

        $name = $classType->name;
        $classType->delete();

        AuditLogger::log('Delete', 'Settings', "Class type {$name} deleted", 'warning', $request);

        return response()->json(['message' => 'Class type deleted.']);
    }

    public function updateLimit(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'max_students_per_teacher' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        PlatformSetting::setValue('max_students_per_teacher', (string) $data['max_students_per_teacher']);

        AuditLogger::log(
            'Edit',
            'Settings',
            "Max students per teacher set to {$data['max_students_per_teacher']}",
            'info',
            $request
        );

        return response()->json([
            'max_students_per_teacher' => PlatformSetting::maxStudentsPerTeacher(),
            'message' => 'Student limit saved.',
        ]);
    }

    private function validateType(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:40',
                Rule::unique('class_types', 'code')->ignore($ignoreId),
            ],
            'name' => ['required', 'string', 'max:120'],
            'name_fr' => ['nullable', 'string', 'max:120'],
            'assessment_grade' => ['required', 'string', Rule::in(self::ASSESSMENT_GRADES)],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }

    private function format(ClassType $type): array
    {
        return [
            'id' => $type->id,
            'code' => $type->code,
            'name' => $type->name,
            'name_fr' => $type->name_fr,
            'assessment_grade' => $type->assessment_grade,
            'sort_order' => $type->sort_order,
            'is_active' => $type->is_active,
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
