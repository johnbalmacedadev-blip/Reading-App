<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedagogicalLesson;
use App\Models\PedagogicalUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PedagogicalUnitController extends Controller
{
    private const ALLOWED_MIMES = 'pdf,zip,doc,docx,ppt,pptx';

    private const VIEWABLE_FORMATS = ['PDF', 'PPT', 'PPTX'];

    public function index(): JsonResponse
    {
        $units = PedagogicalUnit::query()
            ->with('lessons')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'units' => $units->map(fn (PedagogicalUnit $unit) => $this->formatUnit($unit)),
        ]);
    }

    public function show(PedagogicalUnit $pedagogicalUnit): JsonResponse
    {
        $pedagogicalUnit->load('lessons');

        return response()->json([
            'unit' => $this->formatUnit($pedagogicalUnit, true),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateUnit($request);

        $unit = PedagogicalUnit::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
            'color' => $data['color'] ?? '#3b82f6',
            'text_color' => $data['text_color'] ?? '#ffffff',
            'atelier_numbers' => $data['atelier_numbers'] ?? [],
            'sort_order' => $data['sort_order'] ?? (PedagogicalUnit::max('sort_order') + 1),
        ]);

        $this->syncLessonCount($unit, (int) ($data['lesson_count'] ?? 0));

        if ($request->hasFile('quick_sheet')) {
            $this->storeQuickSheet($unit, $request->file('quick_sheet'));
        }

        $unit->load('lessons');

        return response()->json(['unit' => $this->formatUnit($unit, true)], 201);
    }

    public function update(Request $request, PedagogicalUnit $pedagogicalUnit): JsonResponse
    {
        $data = $this->validateUnit($request);

        $pedagogicalUnit->fill([
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
            'color' => $data['color'] ?? $pedagogicalUnit->color,
            'text_color' => $data['text_color'] ?? $pedagogicalUnit->text_color,
            'atelier_numbers' => $data['atelier_numbers'] ?? [],
            'sort_order' => $data['sort_order'] ?? $pedagogicalUnit->sort_order,
        ]);

        if ($request->has('lesson_count')) {
            $this->syncLessonCount($pedagogicalUnit, (int) $data['lesson_count']);
        }

        if ($request->hasFile('quick_sheet')) {
            $this->deleteFile($pedagogicalUnit->quick_sheet_path);
            $this->storeQuickSheet($pedagogicalUnit, $request->file('quick_sheet'));
        }

        $pedagogicalUnit->save();
        $pedagogicalUnit->load('lessons');

        return response()->json(['unit' => $this->formatUnit($pedagogicalUnit, true)]);
    }

    public function destroy(PedagogicalUnit $pedagogicalUnit): JsonResponse
    {
        $this->deleteFile($pedagogicalUnit->quick_sheet_path);

        foreach ($pedagogicalUnit->lessons as $lesson) {
            $this->deleteLessonFiles($lesson);
        }

        $pedagogicalUnit->delete();

        return response()->json(['message' => 'Unit deleted.']);
    }

    public function updateLesson(Request $request, PedagogicalUnit $pedagogicalUnit, int $lessonNumber): JsonResponse
    {
        $lesson = $pedagogicalUnit->lessons()->where('lesson_number', $lessonNumber)->firstOrFail();

        $request->validate([
            'interactive' => ['nullable', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
            'activity_sheet' => ['nullable', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
            'remove_interactive' => ['nullable', 'boolean'],
            'remove_activity_sheet' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('remove_interactive')) {
            $this->deleteFile($lesson->interactive_path);
            $lesson->fill([
                'interactive_path' => null,
                'interactive_format' => null,
                'interactive_size_bytes' => 0,
            ])->save();
        }

        if ($request->boolean('remove_activity_sheet')) {
            $this->deleteFile($lesson->activity_sheet_path);
            $lesson->fill([
                'activity_sheet_path' => null,
                'activity_sheet_format' => null,
                'activity_sheet_size_bytes' => 0,
            ])->save();
        }

        if ($request->hasFile('interactive')) {
            $this->deleteFile($lesson->interactive_path);
            $this->storeLessonFile($lesson, $request->file('interactive'), 'interactive');
        }

        if ($request->hasFile('activity_sheet')) {
            $this->deleteFile($lesson->activity_sheet_path);
            $this->storeLessonFile($lesson, $request->file('activity_sheet'), 'activity_sheet');
        }

        $lesson->refresh();
        $pedagogicalUnit->load('lessons');

        return response()->json(['unit' => $this->formatUnit($pedagogicalUnit, true)]);
    }

    public function downloadQuickSheet(PedagogicalUnit $pedagogicalUnit): StreamedResponse|JsonResponse
    {
        if (! $pedagogicalUnit->quick_sheet_path || ! Storage::disk('public')->exists($pedagogicalUnit->quick_sheet_path)) {
            return response()->json(['message' => 'Quick sheet not found.'], 404);
        }

        $extension = strtolower($pedagogicalUnit->quick_sheet_format ?? 'pdf');
        $filename = Str::slug($pedagogicalUnit->title).'-quick-sheet.'.$extension;

        return Storage::disk('public')->download($pedagogicalUnit->quick_sheet_path, $filename);
    }

    public function viewInteractive(PedagogicalUnit $pedagogicalUnit, int $lessonNumber): StreamedResponse|JsonResponse
    {
        $lesson = $pedagogicalUnit->lessons()->where('lesson_number', $lessonNumber)->firstOrFail();

        if (! $lesson->interactive_path || ! Storage::disk('public')->exists($lesson->interactive_path)) {
            return response()->json(['message' => 'Interactive lesson not found.'], 404);
        }

        if (! $lesson->interactiveViewable()) {
            return response()->json(['message' => 'This file is not available for interactive viewing.'], 403);
        }

        return $this->inlineFileResponse(
            $lesson->interactive_path,
            $lesson->interactive_format,
            Str::slug($pedagogicalUnit->title).'-lesson-'.$lessonNumber
        );
    }

    public function downloadActivitySheet(PedagogicalUnit $pedagogicalUnit, int $lessonNumber): StreamedResponse|JsonResponse
    {
        $lesson = $pedagogicalUnit->lessons()->where('lesson_number', $lessonNumber)->firstOrFail();

        if (! $lesson->activity_sheet_path || ! Storage::disk('public')->exists($lesson->activity_sheet_path)) {
            return response()->json(['message' => 'Activity sheet not found.'], 404);
        }

        $extension = strtolower($lesson->activity_sheet_format ?? 'pdf');
        $filename = Str::slug($pedagogicalUnit->title).'-lesson-'.$lessonNumber.'-activity.'.$extension;

        return Storage::disk('public')->download($lesson->activity_sheet_path, $filename);
    }

    private function validateUnit(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:20'],
            'text_color' => ['nullable', 'string', 'max:20'],
            'atelier_numbers' => ['nullable'],
            'lesson_count' => ['nullable', 'integer', 'min:0', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'quick_sheet' => ['nullable', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
        ]);

        if (isset($data['atelier_numbers']) && is_string($data['atelier_numbers'])) {
            $decoded = json_decode($data['atelier_numbers'], true);
            if (is_array($decoded)) {
                $data['atelier_numbers'] = array_values(array_map('intval', $decoded));
            } else {
                $data['atelier_numbers'] = array_values(array_filter(array_map(
                    'intval',
                    preg_split('/[,\s]+/', $data['atelier_numbers']) ?: []
                )));
            }
        }

        return $data;
    }

    private function syncLessonCount(PedagogicalUnit $unit, int $count): void
    {
        $existing = $unit->lessons()->pluck('lesson_number')->all();

        for ($n = 1; $n <= $count; $n++) {
            if (! in_array($n, $existing, true)) {
                PedagogicalLesson::create([
                    'pedagogical_unit_id' => $unit->id,
                    'lesson_number' => $n,
                ]);
            }
        }

        $toRemove = $unit->lessons()->where('lesson_number', '>', $count)->get();
        foreach ($toRemove as $lesson) {
            $this->deleteLessonFiles($lesson);
            $lesson->delete();
        }
    }

    private function storeQuickSheet(PedagogicalUnit $unit, $file): void
    {
        $extension = strtoupper($file->getClientOriginalExtension());
        $storedName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('pedagogical-units', $storedName, 'public');

        $unit->quick_sheet_path = $path;
        $unit->quick_sheet_format = $extension;
        $unit->quick_sheet_size_bytes = $file->getSize();
        $unit->save();
    }

    private function storeLessonFile(PedagogicalLesson $lesson, $file, string $type): void
    {
        $extension = strtoupper($file->getClientOriginalExtension());
        $storedName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('pedagogical-lessons', $storedName, 'public');

        if ($type === 'interactive') {
            $lesson->interactive_path = $path;
            $lesson->interactive_format = $extension;
            $lesson->interactive_size_bytes = $file->getSize();
        } else {
            $lesson->activity_sheet_path = $path;
            $lesson->activity_sheet_format = $extension;
            $lesson->activity_sheet_size_bytes = $file->getSize();
        }

        $lesson->save();
    }

    private function deleteLessonFiles(PedagogicalLesson $lesson): void
    {
        $this->deleteFile($lesson->interactive_path);
        $this->deleteFile($lesson->activity_sheet_path);
    }

    private function deleteFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function inlineFileResponse(string $path, ?string $format, string $basename): StreamedResponse
    {
        $extension = strtolower($format ?? 'pdf');
        $mime = match ($extension) {
            'pdf' => 'application/pdf',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt' => 'application/vnd.ms-powerpoint',
            default => 'application/octet-stream',
        };

        return Storage::disk('public')->response($path, null, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.$basename.'.'.$extension.'"',
        ]);
    }

    private function formatUnit(PedagogicalUnit $unit, bool $includeLessons = false): array
    {
        $result = [
            'id' => $unit->id,
            'title' => $unit->title,
            'description' => $unit->description,
            'color' => $unit->color,
            'text_color' => $unit->text_color,
            'atelier_numbers' => $unit->atelier_numbers ?? [],
            'atelier_count' => $unit->atelierCount(),
            'lesson_count' => $unit->lessons->count(),
            'sort_order' => $unit->sort_order,
            'has_quick_sheet' => (bool) $unit->quick_sheet_path,
            'quick_sheet_format' => $unit->quick_sheet_format,
            'quick_sheet_size' => $unit->formattedQuickSheetSize(),
        ];

        if ($includeLessons) {
            $result['lessons'] = $unit->lessons->map(fn (PedagogicalLesson $lesson) => [
                'lesson_number' => $lesson->lesson_number,
                'has_interactive' => $lesson->hasInteractive(),
                'has_activity_sheet' => $lesson->hasActivitySheet(),
                'interactive_format' => $lesson->interactive_format,
                'activity_sheet_format' => $lesson->activity_sheet_format,
                'is_interactive_viewable' => $lesson->interactiveViewable(),
            ]);
        }

        return $result;
    }
}
