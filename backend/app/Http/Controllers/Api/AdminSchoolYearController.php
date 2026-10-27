<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
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
            'label' => ['required', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $label = SchoolYear::normalizeLabel($data['label']);
        if (! preg_match('/^\d{4}-\d{4}$/', $label)) {
            throw ValidationException::withMessages([
                'label' => ['Enter a valid school year (e.g. 2026 - 27).'],
            ]);
        }

        $this->assertValidYearRange($label);

        if (SchoolYear::query()->where('label', $label)->exists()) {
            throw ValidationException::withMessages([
                'label' => ['This school year already exists.'],
            ]);
        }

        $schoolYear = SchoolYear::query()->create([
            'label' => $label,
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

    public function destroy(Request $request, SchoolYear $schoolYear): JsonResponse
    {
        if (SchoolYear::query()->count() <= 1) {
            throw ValidationException::withMessages([
                'school_year' => ['You cannot delete the only school year.'],
            ]);
        }

        $label = $schoolYear->label;
        $wasDefault = (bool) $schoolYear->is_default;

        $variants = [$label];
        if (preg_match('/^(\d{4})-(\d{4})$/', $label, $m)) {
            $variants = array_values(array_unique([
                $label,
                $m[1].'-'.substr($m[2], -2),
                $m[1].' - '.substr($m[2], -2),
                $m[1].' - '.$m[2],
                SchoolYear::displayLabel($label),
            ]));
        }

        $inUse = SchoolClass::query()->whereIn('school_year', $variants)->count();

        if ($inUse > 0) {
            throw ValidationException::withMessages([
                'school_year' => ["Cannot delete {$label}: {$inUse} class(es) still use this school year."],
            ]);
        }

        $schoolYear->delete();

        if ($wasDefault) {
            $replacement = SchoolYear::query()->orderByDesc('label')->first();
            if ($replacement) {
                SchoolYear::setDefault($replacement);
            }
        }

        AuditLogger::log('Delete', 'Settings', "School year {$label} deleted", 'warning', $request);

        return response()->json([
            'message' => 'School year deleted.',
            'default_label' => SchoolYear::defaultLabel(),
            'school_years' => SchoolYear::query()
                ->orderByDesc('label')
                ->get()
                ->map(fn (SchoolYear $year) => [
                    'id' => $year->id,
                    'label' => $year->label,
                    'is_default' => $year->is_default,
                ]),
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
                'label' => ['The school year must span exactly one year (e.g. 2025 - 26).'],
            ]);
        }
    }
}
