<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminSchoolYearController extends Controller
{
    public function index(): JsonResponse
    {
        $years = SchoolYear::query()
            ->orderByDesc('label')
            ->get()
            ->map(fn (SchoolYear $year) => [
                'id' => $year->id,
                'label' => $year->label,
                'is_default' => $year->is_default,
            ]);

        return response()->json([
            'school_years' => $years,
            'default_label' => SchoolYear::defaultLabel(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:20', 'regex:/^\d{4}-\d{4}$/', 'unique:school_years,label'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $this->assertValidYearRange($data['label']);

        $schoolYear = SchoolYear::query()->create([
            'label' => $data['label'],
            'is_default' => false,
        ]);

        if (! empty($data['is_default'])) {
            SchoolYear::setDefault($schoolYear);
            $schoolYear->refresh();
        } elseif (! SchoolYear::query()->where('is_default', true)->exists()) {
            SchoolYear::setDefault($schoolYear);
            $schoolYear->refresh();
        }

        AuditLogger::log('Create', 'Settings', "School year {$schoolYear->label} created", 'warning', $request, subject: $schoolYear);

        return response()->json([
            'school_year' => [
                'id' => $schoolYear->id,
                'label' => $schoolYear->label,
                'is_default' => $schoolYear->is_default,
            ],
            'default_label' => SchoolYear::defaultLabel(),
        ], 201);
    }

    public function setDefault(Request $request, SchoolYear $schoolYear): JsonResponse
    {
        SchoolYear::setDefault($schoolYear);
        $schoolYear->refresh();

        AuditLogger::log('Edit', 'Settings', "Default school year set to {$schoolYear->label}", 'warning', $request, subject: $schoolYear);

        return response()->json([
            'school_year' => [
                'id' => $schoolYear->id,
                'label' => $schoolYear->label,
                'is_default' => true,
            ],
            'default_label' => $schoolYear->label,
        ]);
    }

    private function assertValidYearRange(string $label): void
    {
        if (! preg_match('/^(\d{4})-(\d{4})$/', $label, $matches)) {
            return;
        }

        $start = (int) $matches[1];
        $end = (int) $matches[2];

        if ($end !== $start + 1) {
            throw ValidationException::withMessages([
                'label' => ['The school year must span exactly one year (e.g. 2025-2026).'],
            ]);
        }
    }
}
