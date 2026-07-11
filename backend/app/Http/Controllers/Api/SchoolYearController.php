<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use Illuminate\Http\JsonResponse;

class SchoolYearController extends Controller
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
}
