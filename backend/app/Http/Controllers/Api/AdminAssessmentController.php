<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAtelierFile;
use App\Models\ClassType;
use App\Models\StudentEvaluation;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAssessmentController extends Controller
{
    public const GRADE_ALL = 'All';

    private const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 3+'];

    /** @var array<string, list<string>> */
    private const CLASS_GRADE_ALIASES = [
        'Kindergarten' => [
            'Kindergarten',
            'Maternelle',
            'Jardin',
            'Junior Kindergarten (JK)',
            'Senior Kindergarten (SK)',
            'JK',
            'SK',
        ],
        'Grade 1' => ['Grade 1', '1re année'],
        'Grade 2' => ['Grade 2', '2e année'],
        'Grade 3' => ['Grade 3', '3e année'],
        'Grade 3+' => ['Grade 3+', '3e année+', '4e année', '5e année', '6e année', 'Grade 4', 'Grade 5', 'Grade 6'],
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Assessment::query()
            ->with(['questions', 'atelierFiles'])
            ->whereNull('school_board')
            ->whereNull('school_id')
            ->whereNull('teacher_id')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(atelier AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhere('template_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('grade') && $request->string('grade')->toString() !== 'All Grades') {
            $query->where('grade', $request->string('grade')->toString());
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', strtolower($request->string('status')->toString()));
        }

        $all = $query->get();
        $active = $all->whereNull('archived_at')->values();
        $archived = $all->whereNotNull('archived_at')->values();

        return response()->json([
            'assessments' => $active->map(fn (Assessment $a) => $this->format($a))->all(),
            'archived' => $archived->map(fn (Assessment $a) => $this->format($a))->all(),
            'summary' => [
                'published' => $active->where('status', 'published')->count(),
                'drafts' => $active->where('status', 'draft')->count(),
                'archived' => $archived->count(),
            ],
            'assessment_grades' => ClassType::assessmentGradeOptions(),
            'grade_options' => ClassType::activeOrdered()
                ->get()
                ->map(fn (ClassType $type) => [
                    'value' => $type->name,
                    'label' => $type->name,
                    'label_fr' => $type->name_fr ?: $type->name,
                    'assessment_grade' => $type->assessment_grade,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateAssessment($request);

        $assessment = DB::transaction(function () use ($data) {
            $assessment = Assessment::create([
                'title' => $data['title'],
                'unit' => $data['unit'] ?? null,
                'atelier' => $data['atelier'],
                'grade' => $data['grade'],
                'status' => strtolower($data['status']),
                'template_id' => $data['template_id'] ?? null,
                'template_draft' => $data['template_draft'] ?? null,
            ]);

            $this->syncQuestions($assessment, $data['questions']);

            return $assessment->load('questions');
        });

        AuditLogger::log('Create', 'Assessment', "{$assessment->title} created", 'info', $request, subject: $assessment);

        return response()->json(['assessment' => $this->format($assessment)], 201);
    }

    public function update(Request $request, Assessment $assessment): JsonResponse
    {
        $data = $this->validateAssessment($request);

        DB::transaction(function () use ($assessment, $data) {
            $assessment->update([
                'title' => $data['title'],
                'unit' => $data['unit'] ?? null,
                'atelier' => $data['atelier'],
                'grade' => $data['grade'],
                'status' => strtolower($data['status']),
                'template_id' => $data['template_id'] ?? null,
                'template_draft' => $data['template_draft'] ?? null,
            ]);

            $this->syncQuestions($assessment, $data['questions']);
        });

        AuditLogger::log('Edit', 'Assessment', "{$assessment->title} updated", 'info', $request, subject: $assessment);

        return response()->json(['assessment' => $this->format($assessment->fresh('questions'))]);
    }

    public function destroy(Request $request, Assessment $assessment): JsonResponse
    {
        // Active workshops with student records must be archived first.
        // Archived workshops may be permanently deleted.
        if ($assessment->archived_at === null && $this->hasStudentCompletions($assessment)) {
            return response()->json([
                'message' => 'This workshop has student evaluation records and cannot be deleted. Archive it instead.',
                'can_archive' => true,
            ], 422);
        }

        $title = $assessment->title;
        $wasArchived = $assessment->archived_at !== null;
        $this->deleteAtelierFilesForAssessment($assessment);
        $assessment->delete();

        AuditLogger::log(
            'Delete',
            'Assessment',
            $wasArchived ? "{$title} permanently deleted from archive" : "{$title} deleted",
            'warning',
            $request
        );

        return response()->json(['message' => 'Assessment deleted.']);
    }

    public function clearArchived(Request $request): JsonResponse
    {
        $query = Assessment::query()
            ->whereNull('school_board')
            ->whereNull('school_id')
            ->whereNull('teacher_id')
            ->whereNotNull('archived_at');

        $assessments = (clone $query)->with('atelierFiles')->get();
        $count = $assessments->count();

        foreach ($assessments as $assessment) {
            $this->deleteAtelierFilesForAssessment($assessment);
        }

        $query->delete();

        AuditLogger::log('Delete', 'Assessment', "Cleared {$count} archived platform assessment(s)", 'warning', $request);

        return response()->json([
            'message' => "Deleted {$count} archived assessment(s).",
            'deleted' => $count,
        ]);
    }

    public function archive(Request $request, Assessment $assessment): JsonResponse
    {
        if ($assessment->school_board !== null) {
            abort(403);
        }

        if ($assessment->archived_at !== null) {
            return response()->json(['assessment' => $this->format($assessment)]);
        }

        $assessment->update(['archived_at' => now()]);

        AuditLogger::log('Archive', 'Assessment', "{$assessment->title} archived", 'warning', $request, subject: $assessment);

        return response()->json([
            'assessment' => $this->format($assessment->fresh('questions')),
            'message' => 'Assessment archived.',
        ]);
    }

    public function restore(Request $request, Assessment $assessment): JsonResponse
    {
        if ($assessment->school_board !== null) {
            abort(403);
        }

        $assessment->update(['archived_at' => null]);

        AuditLogger::log('Restore', 'Assessment', "{$assessment->title} restored", 'info', $request, subject: $assessment);

        return response()->json([
            'assessment' => $this->format($assessment->fresh('questions')),
            'message' => 'Assessment restored.',
        ]);
    }

    public function duplicate(Request $request, Assessment $assessment): JsonResponse
    {
        $copy = DB::transaction(function () use ($assessment) {
            $assessment->load(['questions', 'atelierFiles']);

            $copy = Assessment::create([
                'title' => "{$assessment->title} (copy)",
                'unit' => $assessment->unit,
                'atelier' => $assessment->atelier,
                'grade' => $assessment->grade,
                'status' => 'draft',
                'template_id' => $assessment->template_id,
                'template_draft' => $assessment->template_draft,
            ]);

            foreach ($assessment->questions as $question) {
                $copy->questions()->create([
                    'sort_order' => $question->sort_order,
                    'text' => $question->text,
                    'options' => $question->options,
                    'correct_index' => $question->correct_index,
                ]);
            }

            foreach ($assessment->atelierFiles as $index => $file) {
                $newPath = $this->copyAtelierFile($file->file_path);
                if (! $newPath) {
                    continue;
                }

                $copy->atelierFiles()->create([
                    'file_path' => $newPath,
                    'original_name' => $file->original_name,
                    'file_type' => $file->file_type,
                    'mime_type' => $file->mime_type,
                    'file_size_bytes' => $file->file_size_bytes,
                    'sort_order' => $index,
                ]);
            }

            return $copy->load(['questions', 'atelierFiles']);
        });

        AuditLogger::log('Duplicate', 'Assessment', "{$copy->title} duplicated from {$assessment->title}", 'info', $request, subject: $copy);

        return response()->json(['assessment' => $this->format($copy)], 201);
    }

    public function uploadAtelierFiles(Request $request, Assessment $assessment): JsonResponse
    {
        $this->ensurePlatformAssessment($assessment);

        $data = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:20'],
            'files.*' => ['file', 'mimes:pdf,ppt,pptx,doc,docx', 'max:51200'],
        ]);

        $nextSort = (int) $assessment->atelierFiles()->max('sort_order') + 1;
        $uploaded = 0;

        foreach ($data['files'] as $uploadedFile) {
            /** @var \Illuminate\Http\UploadedFile $uploadedFile */
            $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: 'pdf');
            if (! in_array($extension, ['pdf', 'ppt', 'pptx', 'doc', 'docx'], true)) {
                continue;
            }

            $storedName = Str::uuid()->toString().'.'.$extension;
            $path = $uploadedFile->storeAs('atelier-files', $storedName, 'public');

            $assessment->atelierFiles()->create([
                'file_path' => $path,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'file_type' => $extension,
                'mime_type' => $uploadedFile->getClientMimeType() ?: null,
                'file_size_bytes' => $uploadedFile->getSize() ?: 0,
                'sort_order' => $nextSort++,
            ]);
            $uploaded++;
        }

        AuditLogger::log(
            'Upload',
            'Assessment',
            "{$uploaded} student support file(s) attached to {$assessment->title}",
            'info',
            $request,
            subject: $assessment,
        );

        return response()->json([
            'assessment' => $this->format($assessment->fresh(['questions', 'atelierFiles'])),
            'message' => $uploaded === 1
                ? 'File uploaded.'
                : "{$uploaded} files uploaded.",
        ]);
    }

    public function replaceAtelierPdf(Request $request, Assessment $assessment): JsonResponse
    {
        $this->ensurePlatformAssessment($assessment);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $uploadedFile */
        $uploadedFile = $data['file'];

        foreach ($assessment->atelierFiles()->where('file_type', 'pdf')->get() as $existing) {
            $this->deleteStoredFile($existing->file_path);
            $existing->delete();
        }

        $storedName = Str::uuid()->toString().'.pdf';
        $path = $uploadedFile->storeAs('atelier-files', $storedName, 'public');

        $assessment->atelierFiles()->create([
            'file_path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'file_type' => 'pdf',
            'mime_type' => $uploadedFile->getClientMimeType() ?: 'application/pdf',
            'file_size_bytes' => $uploadedFile->getSize() ?: 0,
            'sort_order' => ((int) $assessment->atelierFiles()->max('sort_order')) + 1,
        ]);

        AuditLogger::log(
            'Upload',
            'Assessment',
            "Atelier PDF replaced on {$assessment->title}",
            'info',
            $request,
            subject: $assessment,
        );

        return response()->json([
            'assessment' => $this->format($assessment->fresh(['questions', 'atelierFiles'])),
            'message' => 'PDF saved.',
        ]);
    }

    public function destroyAtelierFile(Request $request, Assessment $assessment, AssessmentAtelierFile $atelierFile): JsonResponse
    {
        $this->ensurePlatformAssessment($assessment);
        abort_unless((int) $atelierFile->assessment_id === (int) $assessment->id, 404);

        $name = $atelierFile->original_name;
        $this->deleteStoredFile($atelierFile->file_path);
        $atelierFile->delete();

        AuditLogger::log(
            'Delete',
            'Assessment',
            "Student support file removed from {$assessment->title}: {$name}",
            'warning',
            $request,
            subject: $assessment,
        );

        return response()->json([
            'assessment' => $this->format($assessment->fresh(['questions', 'atelierFiles'])),
            'message' => 'File deleted.',
        ]);
    }

    public function downloadAtelierFile(Assessment $assessment, AssessmentAtelierFile $atelierFile): StreamedResponse|JsonResponse
    {
        $this->ensurePlatformAssessment($assessment);
        abort_unless((int) $atelierFile->assessment_id === (int) $assessment->id, 404);

        if (! Storage::disk('public')->exists($atelierFile->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $filename = $atelierFile->original_name
            ?: ('atelier-'.$assessment->atelier.'.'.$atelierFile->file_type);

        return Storage::disk('public')->download(
            $atelierFile->file_path,
            $filename,
            ['Content-Type' => $atelierFile->contentType()]
        );
    }

    public function viewAtelierFile(Assessment $assessment, AssessmentAtelierFile $atelierFile): StreamedResponse|JsonResponse
    {
        $this->ensurePlatformAssessment($assessment);
        abort_unless((int) $atelierFile->assessment_id === (int) $assessment->id, 404);

        if (! Storage::disk('public')->exists($atelierFile->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $filename = $atelierFile->original_name
            ?: ('atelier-'.$assessment->atelier.'.'.$atelierFile->file_type);

        return Storage::disk('public')->response(
            $atelierFile->file_path,
            $filename,
            [
                'Content-Type' => $atelierFile->contentType(),
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
            ]
        );
    }

    private function hasStudentCompletions(Assessment $assessment): bool
    {
        $query = StudentEvaluation::query()
            ->join('classes', 'classes.id', '=', 'student_evaluations.class_id')
            ->where('student_evaluations.atelier_number', $assessment->atelier)
            ->whereNotNull('student_evaluations.responses')
            ->whereRaw('JSON_LENGTH(student_evaluations.responses) > 0');

        if ($assessment->grade !== self::GRADE_ALL) {
            $classGrades = self::CLASS_GRADE_ALIASES[$assessment->grade] ?? [$assessment->grade];
            $query->whereIn('classes.grade', $classGrades);
        }

        return $query->exists();
    }

    /** @return list<string> */
    private function allowedGrades(): array
    {
        return array_values(array_unique(array_merge(
            [self::GRADE_ALL],
            ClassType::allowedGradeValues(true),
            ClassType::assessmentGradeOptions(),
            self::GRADES,
        )));
    }

    /** @return array<string, mixed> */
    private function validateAssessment(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:50'],
            'atelier' => ['required', 'integer', 'min:1', 'max:15'],
            'grade' => ['required', 'string', Rule::in($this->allowedGrades())],
            'status' => ['required', 'string', Rule::in(['Published', 'Draft', 'published', 'draft'])],
            'template_id' => ['nullable', 'string', 'max:50'],
            'template_draft' => ['nullable', 'array'],
            'questions' => ['present', 'array'],
            'questions.*.text' => ['required_with:questions', 'string', 'max:1000'],
            'questions.*.options' => ['required_with:questions', 'array', 'size:4'],
            'questions.*.options.*' => ['required_with:questions', 'string', 'max:500'],
            'questions.*.correct' => ['required_with:questions', 'integer', 'min:0', 'max:3'],
        ]);

        $usesTemplate = ! empty($data['template_id']);

        if (! $usesTemplate) {
            foreach ($data['questions'] as $index => $question) {
                if (empty($question['text']) || empty($question['options']) || ! isset($question['correct'])) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "questions.{$index}" => ['Each question must include text, four options, and a correct answer.'],
                    ]);
                }
            }
        } else {
            $data['questions'] = [];
        }

        $atelier = (int) $data['atelier'];
        if (! $usesTemplate && ! preg_match('/^Atelier\s+\d+/i', $data['title'])) {
            $data['title'] = "Atelier {$atelier} Assessment";
        }

        $data['status'] = ucfirst(strtolower($data['status']));

        if ($data['status'] === 'Published') {
            if ($usesTemplate && empty($data['template_draft'])) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'template_draft' => ['Template content is required before publishing.'],
                ]);
            }

            if (! $usesTemplate && count($data['questions']) === 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'questions' => ['Add at least one question before publishing.'],
                ]);
            }
        }

        return $data;
    }

    /** @param list<array{text: string, options: list<string>, correct: int}> $questions */
    private function syncQuestions(Assessment $assessment, array $questions): void
    {
        $assessment->questions()->delete();

        foreach ($questions as $index => $question) {
            $assessment->questions()->create([
                'sort_order' => $index,
                'text' => $question['text'],
                'options' => $question['options'],
                'correct_index' => $question['correct'],
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function format(Assessment $assessment): array
    {
        if (! $assessment->relationLoaded('atelierFiles')) {
            $assessment->load('atelierFiles');
        }

        $files = $this->formatAtelierFiles($assessment->atelierFiles);
        $pdf = collect($files)->firstWhere('type', 'pdf');

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => ucfirst($assessment->status),
            'created' => $assessment->created_at?->toDateString() ?? '',
            'template_id' => $assessment->template_id,
            'template_draft' => $assessment->template_draft,
            'archived_at' => $assessment->archived_at?->toIso8601String(),
            'is_archived' => $assessment->archived_at !== null,
            'has_student_completions' => $this->hasStudentCompletions($assessment),
            'has_atelier_files' => count($files) > 0,
            'atelier_files' => $files,
            'has_atelier_pdf' => $pdf !== null,
            'atelier_pdf' => $pdf,
            'atelier_pdf_name' => $pdf['name'] ?? null,
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }

    /** @param Collection<int, AssessmentAtelierFile>|iterable<AssessmentAtelierFile> $files */
    private function formatAtelierFiles(iterable $files): array
    {
        return collect($files)->map(fn (AssessmentAtelierFile $file) => [
            'id' => $file->id,
            'name' => $file->original_name,
            'type' => $file->file_type,
            'mime_type' => $file->mime_type,
            'size' => $file->formattedSize(),
            'size_bytes' => (int) $file->file_size_bytes,
        ])->values()->all();
    }

    private function ensurePlatformAssessment(Assessment $assessment): void
    {
        abort_unless($assessment->isPlatformOriginal(), 404);
    }

    private function deleteAtelierFilesForAssessment(Assessment $assessment): void
    {
        $files = $assessment->relationLoaded('atelierFiles')
            ? $assessment->atelierFiles
            : $assessment->atelierFiles()->get();

        foreach ($files as $file) {
            $this->deleteStoredFile($file->file_path);
        }

        $assessment->atelierFiles()->delete();
    }

    private function deleteStoredFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function copyAtelierFile(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION) ?: 'pdf';
        $newPath = 'atelier-files/'.Str::uuid()->toString().'.'.$extension;
        Storage::disk('public')->copy($path, $newPath);

        return $newPath;
    }
}
