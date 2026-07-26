<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SignupDirectoryController extends Controller
{
    public function schools(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) < 2) {
            return response()->json(['schools' => []]);
        }

        $schools = School::query()
            ->where('status', 'active')
            ->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'city', 'school_board']);

        return response()->json([
            'schools' => $schools->map(fn (School $school) => [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city,
                'school_board' => $school->school_board,
            ]),
        ]);
    }

    public function boards(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) < 2) {
            return response()->json(['boards' => []]);
        }

        $boards = SchoolBoard::query()
            ->where('status', 'active')
            ->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('region', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'code', 'region']);

        return response()->json([
            'boards' => $boards->map(fn (SchoolBoard $board) => [
                'id' => $board->id,
                'name' => $board->name,
                'code' => $board->code,
                'region' => $board->region,
            ]),
        ]);
    }
}
