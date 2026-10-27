<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentAtelierFile;
use App\Models\BoardAssessmentArchive;
use App\Models\School;
use App\Models\SchoolAssessmentArchive;
use App\Models\SchoolBoard;
use App\Models\TeacherAssessmentArchive;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherAssessmentController extends Controller
{
    private const GRADE_ALL = 'All';

    private const GRADES = ['All', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 3+'];

    private const GRADE_FILTER_MAP = [
        'kindergarten' => 'Kindergarten',
        'garden' => 'Kindergarten',
        'grade1' => 'Grade 1',
        'grade2' => 'Grade 2',
        'grade3' => 'Grade 3',
        'grade3plus' => 'Grade 3+',
    ];

    /** @var array<string, string> */
    private const GRADE_ALIASES = [
        'Maternelle' => 'Kindergarten',
        'Jardin' => 'Kindergarten',
        'Junior Kindergarten (JK)' => 'Kindergarten',
        'Senior Kindergarten (SK)' => 'Kindergarten',
        'JK' => 'Kindergarten',
        'SK' => 'Kindergarten',
        '1re année' => 'Grade 1',
        '2e année' => 'Grade 2',
        '3e année' => 'Grade 3',
        '3e année+' => 'Grade 3+',
        '4e année' => 'Grade 3+',
        '5e année' => 'Grade 3+',
        '6e année' => 'Grade 3+',
        'Grade 4' => 'Grade 3+',
        'Grade 5' => 'Grade 3+',
        'Grade 6' => 'Grade 3+',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->ensureIndependentTeacherAccess($request);
        $context = $this->resolveContext($request);

        if ($context['board_code']) {
            $assessments = $this->boardSyncedQuery($context['board_code'], $request)
                ->get()
                ->map(fn (Assessment $a) => $this->format($a, $context['board_code'], false, false));
            $archived = collect();

            return response()->json([
                'sync_source' => 'board',
                'can_edit' => false,
                'school_board' => $this->formatSchoolBoard($context['board_code']),
                'school' => $this->formatSchool($context['school']),
                'assessments' => $assessments->values()->all(),
                'archived' => [],
                'summary' => [
                    'total' => $assessments->count(),
                    'published' => $assessments->count(),
                    'drafts' => 0,
                    'archived' => 0,
                ],
            ]);
        }

        if ($context['school_id'] === null) {
            return $this->platformEditableIndex($request, $context, $context['teacher_id'], 'teacher');
        }

        return $this->platformEditableIndex($request, $context, $context['school_id'], 'school');
    }

    /** @return JsonResponse */
    private function platformEditableIndex(Request $request, array $context, int $scopeId, string $scope): JsonResponse
    {
        $isTeacher = $scope === 'teacher';
        $archivedIds = $isTeacher
            ? TeacherAssessmentArchive::query()->where('teacher_id', $scopeId)->pluck('assessment_id')
            : SchoolAssessmentArchive::query()->where('school_id', $scopeId)->pluck('assessment_id');

        $copyQuery = Assessment::query()
            ->whereNotIn('id', $archivedIds)
            ->whereNotNull('source_assessment_id');

        if ($isTeacher) {
            $copyQuery->where('teacher_id', $scopeId);
        } else {
            $copyQuery->where('school_id', $scopeId);
        }

        $activeCopySourceIds = $copyQuery->pluck('source_assessment_id');

        $activeQuery = Assessment::query()
            ->withCount('questions')
            ->where(function ($query) use ($scopeId, $scope, $archivedIds, $activeCopySourceIds, $isTeacher) {
                $query->where(function ($q) use ($scopeId, $scope, $archivedIds, $isTeacher) {
                    if ($isTeacher) {
                        $q->where('teacher_id', $scopeId);
                    } else {
                        $q->where('school_id', $scopeId);
                    }
                    $q->whereNotIn('id', $archivedIds);
                })->orWhere(function ($q) use ($archivedIds, $activeCopySourceIds) {
                    $q->whereNull('school_board')
                        ->whereNull('school_id')
                        ->whereNull('teacher_id')
                        ->whereNull('archived_at')
                        ->where('status', 'published')
                        ->whereNotIn('id', $archivedIds)
                        ->when($activeCopySourceIds->isNotEmpty(), function ($inner) use ($activeCopySourceIds) {
                            $inner->whereNotIn('id', $activeCopySourceIds);
                        });
                });
            })
            ->orderByDesc('created_at');

        $archivedQuery = Assessment::query()
            ->withCount('questions')
            ->whereIn('id', $archivedIds)
            ->where(function ($query) use ($scopeId, $isTeacher) {
                if ($isTeacher) {
                    $query->where('teacher_id', $scopeId);
                } else {
                    $query->where('school_id', $scopeId);
                }
                $query->orWhere(function ($q) {
                    $q->whereNull('school_board')
                        ->whereNull('school_id')
                        ->whereNull('teacher_id')
                        ->whereNull('archived_at')
                        ->where('status', 'published');
                });
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($activeQuery, $request, true);
        $this->applyListFilters($archivedQuery, $request, true);

        $active = $activeQuery->get()->map(fn (Assessment $a) => $this->format($a, null, false, true, $scopeId, $scope));
        $archived = $archivedQuery->get()->map(fn (Assessment $a) => $this->format($a, null, true, true, $scopeId, $scope));

        return response()->json([
            'sync_source' => 'platform',
            'can_edit' => true,
            'school_board' => null,
            'school' => $this->formatSchool($context['school']),
            'assessments' => $active->values()->all(),
            'archived' => $archived->values()->all(),
            'summary' => [
                'total' => $active->count(),
                'published' => $active->where('status', 'published')->count(),
                'drafts' => $active->where('status', 'draft')->count(),
                'archived' => $archived->count(),
            ],
        ]);
    }

    public function show(Request $request, Assessment $assessment): JsonResponse
    {
        $this->ensureIndependentTeacherAccess($request);
        $context = $this->resolveContext($request);
        $this->authorizeTeacherAccess($assessment, $context);

        $assessment->load('questions');

        $isArchived = false;
        if ($context['board_code']) {
            $isArchived = BoardAssessmentArchive::query()
                ->where('school_board', $context['board_code'])
                ->where('assessment_id', $assessment->id)
                ->exists();
        } elseif ($context['school_id']) {
            $isArchived = SchoolAssessmentArchive::query()
                ->where('school_id', $context['school_id'])
                ->where('assessment_id', $assessment->id)
                ->exists();
        } else {
            $isArchived = TeacherAssessmentArchive::query()
                ->where('teacher_id', $context['teacher_id'])
                ->where('assessment_id', $assessment->id)
                ->exists();
        }

        $scope = $context['school_id'] ? 'school' : 'teacher';
        $scopeId = $context['school_id'] ?? $context['teacher_id'];

        return response()->json([
            'assessment' => $this->formatDetail(
                $assessment,
                $context['board_code'],
                $isArchived,
                ! $context['board_code'],
                $scopeId,
                $scope
            ),
        ]);
    }

    public function update(Request $request, Assessment $assessment): JsonResponse
    {
        $this->ensureIndependentTeacherAccess($request);
        $context = $this->resolveContext($request);

        if ($context['board_code']) {
            abort(403, 'Assessments are view-only when your school is linked to a school board.');
        }

        $this->authorizeTeacherAccess($assessment, $context);
        $this->authorizePlatformAssessmentVisible($assessment);

        $data = $this->validateAssessment($request);
        $scope = $context['school_id'] ? 'school' : 'teacher';
        $scopeId = $context['school_id'] ?? $context['teacher_id'];

        $target = DB::transaction(function () use ($assessment, $data, $scopeId, $scope) {
            $isTeacher = $scope === 'teacher';
            $ownsCopy = $isTeacher
                ? $assessment->teacher_id === $scopeId
                : $assessment->school_id === $scopeId;

            if ($ownsCopy) {
                $this->applyAssessmentData($assessment, $data);
                $this->setActiveScopedAssessment($assessment, $scopeId, $scope);
                $assessment->load('questions');

                return ['assessment' => $assessment, 'created_copy' => false];
            }

            $copyQuery = Assessment::query()->where('source_assessment_id', $assessment->id);
            if ($isTeacher) {
                $copyQuery->where('teacher_id', $scopeId);
            } else {
                $copyQuery->where('school_id', $scopeId);
            }
            $copy = $copyQuery->first();

            $createdCopy = false;

            if (! $copy) {
                $attributes = [
                    'title' => $data['title'],
                    'unit' => $data['unit'] ?? null,
                    'atelier' => $data['atelier'],
                    'grade' => $data['grade'],
                    'status' => strtolower($data['status']),
                    'source_assessment_id' => $assessment->id,
                    'template_id' => $data['template_id'] ?? null,
                    'template_draft' => $data['template_draft'] ?? null,
                ];
                if ($isTeacher) {
                    $attributes['teacher_id'] = $scopeId;
                } else {
                    $attributes['school_id'] = $scopeId;
                }
                $copy = Assessment::create($attributes);
                if (empty($data['template_id'])) {
                    $this->syncQuestions($copy, $data['questions']);
                }
                $createdCopy = true;
            } else {
                $this->applyAssessmentData($copy, $data);
            }

            $copy->load('questions');
            $this->setActiveScopedAssessment($copy, $scopeId, $scope);

            return ['assessment' => $copy, 'created_copy' => $createdCopy];
        });

        AuditLogger::log('Edit', 'Assessment', "{$target['assessment']->title} updated", 'info', $request, subject: $target['assessment']);

        return response()->json([
            'assessment' => $this->formatDetail($target['assessment'], null, false, true, $scopeId, $scope),
            'created_copy' => $target['created_copy'],
        ]);
    }

    public function activate(Request $request, Assessment $assessment): JsonResponse
    {
        $this->ensureIndependentTeacherAccess($request);
        $context = $this->resolveContext($request);

        if ($context['board_code']) {
            abort(403, 'Assessments are view-only when your school is linked to a school board.');
        }

        $this->authorizeTeacherAccess($assessment, $context);
        $scope = $context['school_id'] ? 'school' : 'teacher';
        $scopeId = $context['school_id'] ?? $context['teacher_id'];

        DB::transaction(function () use ($assessment, $scopeId, $scope) {
            $this->setActiveScopedAssessment($assessment, $scopeId, $scope);
        });

        $assessment->loadCount('questions');

        AuditLogger::log('Activate', 'Assessment', "{$assessment->title} activated", 'info', $request, subject: $assessment);

        return response()->json([
            'assessment' => $this->format($assessment, null, false, true, $scopeId, $scope),
        ]);
    }

    public function published(Request $request): JsonResponse
    {
        $atelier = (int) $request->query('atelier', 0);
        $rawGrade = is_string($request->query('grade')) ? trim($request->query('grade')) : '';
        $grade = $this->normalizeGrade($rawGrade);

        if ($atelier < 1 || $atelier > 15 || ($grade === '' && $rawGrade === '')) {
            return response()->json(['assessment' => null]);
        }

        try {
            $context = $this->resolveContext($request);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException) {
            return response()->json(['assessment' => null]);
        }

        $assessment = $context['board_code']
            ? $this->resolveBoardPublished($context['board_code'], $atelier, $grade, $rawGrade)
            : ($context['school_id']
                ? $this->resolveSchoolPublished($context['school_id'], $atelier, $grade, $rawGrade)
                : $this->resolveTeacherPublished($context['teacher_id'], $atelier, $grade, $rawGrade));

        if (! $assessment) {
            return response()->json(['assessment' => null]);
        }

        $files = $this->resolveAtelierFiles($assessment);

        return response()->json([
            'assessment' => [
                'id' => $assessment->id,
                'title' => $assessment->title,
                'unit' => $assessment->unit ?? '',
                'atelier' => $assessment->atelier,
                'grade' => $assessment->grade,
                'template_id' => $assessment->template_id,
                'template_draft' => $assessment->template_draft,
                'has_atelier_files' => $files->isNotEmpty(),
                'atelier_files' => $files->map(fn (AssessmentAtelierFile $file) => [
                    'id' => $file->id,
                    'name' => $file->original_name,
                    'type' => $file->file_type,
                    'mime_type' => $file->mime_type,
                    'size' => $file->formattedSize(),
                ])->values()->all(),
                'has_atelier_pdf' => $files->contains(fn (AssessmentAtelierFile $file) => $file->file_type === 'pdf'),
                'atelier_pdf_name' => $files->firstWhere('file_type', 'pdf')?->original_name,
            ],
        ]);
    }

    public function downloadAtelierFile(Request $request, AssessmentAtelierFile $atelierFile): StreamedResponse|JsonResponse
    {
        $atelier = (int) $request->query('atelier', 0);
        $rawGrade = is_string($request->query('grade')) ? trim($request->query('grade')) : '';
        $grade = $this->normalizeGrade($rawGrade);

        if ($atelier < 1 || $atelier > 15 || ($grade === '' && $rawGrade === '')) {
            return response()->json(['message' => 'Invalid workshop or grade.'], 422);
        }

        $context = $this->resolveContext($request);

        $assessment = $context['board_code']
            ? $this->resolveBoardPublished($context['board_code'], $atelier, $grade, $rawGrade)
            : ($context['school_id']
                ? $this->resolveSchoolPublished($context['school_id'], $atelier, $grade, $rawGrade)
                : $this->resolveTeacherPublished($context['teacher_id'], $atelier, $grade, $rawGrade));

        if (! $assessment) {
            return response()->json(['message' => 'Assessment not found.'], 404);
        }

        $allowedIds = $this->resolveAtelierFiles($assessment)->pluck('id')->all();
        if (! in_array((int) $atelierFile->id, array_map('intval', $allowedIds), true)) {
            return response()->json(['message' => 'Student support file not found.'], 404);
        }

        if (! Storage::disk('public')->exists($atelierFile->file_path)) {
            return response()->json(['message' => 'Student support file not found.'], 404);
        }

        $filename = $atelierFile->original_name
            ?: ('atelier-'.$assessment->atelier.'-support.'.$atelierFile->file_type);

        $disposition = $atelierFile->file_type === 'pdf' ? 'inline' : 'attachment';

        return Storage::disk('public')->response(
            $atelierFile->file_path,
            $filename,
            ['Content-Type' => $atelierFile->contentType()],
            $disposition
        );
    }

    /** @return Collection<int, AssessmentAtelierFile> */
    private function resolveAtelierFiles(Assessment $assessment): Collection
    {
        $visited = [];
        $current = $assessment;

        while ($current && ! isset($visited[$current->id])) {
            $visited[$current->id] = true;
            $files = $this->existingAtelierFiles($current);
            if ($files->isNotEmpty()) {
                return $files;
            }

            if (! $current->source_assessment_id) {
                break;
            }

            $current = Assessment::query()->find($current->source_assessment_id);
        }

        $platformCandidates = Assessment::query()
            ->whereNull('school_board')
            ->whereNull('school_id')
            ->whereNull('teacher_id')
            ->where('atelier', $assessment->atelier)
            ->whereHas('atelierFiles')
            ->orderByRaw('CASE WHEN grade = ? THEN 0 ELSE 1 END', [$assessment->grade])
            ->with('atelierFiles')
            ->get();

        foreach ($platformCandidates as $candidate) {
            $files = $this->existingAtelierFiles($candidate);
            if ($files->isNotEmpty()) {
                return $files;
            }
        }

        return collect();
    }

    /** @return Collection<int, AssessmentAtelierFile> */
    private function existingAtelierFiles(Assessment $assessment): Collection
    {
        $files = $assessment->relationLoaded('atelierFiles')
            ? $assessment->atelierFiles
            : $assessment->atelierFiles()->get();

        return $files
            ->filter(fn (AssessmentAtelierFile $file) => filled($file->file_path)
                && Storage::disk('public')->exists($file->file_path))
            ->values();
    }

    /** @return array{school: School|null, school_id: int|null, teacher_id: int, board_code: string|null} */
    private function resolveContext(Request $request): array
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'teacher') {
            abort(403, 'Teacher portal access required.');
        }

        $school = $user->school_id
            ? School::query()->find($user->school_id)
            : null;

        $boardCode = trim((string) ($user->school_board ?: $school?->school_board ?? ''));

        return [
            'school' => $school,
            'school_id' => $school ? (int) $school->id : null,
            'teacher_id' => (int) $user->id,
            'board_code' => $boardCode !== '' ? $boardCode : null,
        ];
    }

    private function ensureIndependentTeacherAccess(Request $request): void
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user || $user->role !== 'teacher') {
            abort(403, 'Teacher portal access required.');
        }

        $hasSchool = (bool) $user->school_id;
        $hasBoard = trim((string) ($user->school_board ?? '')) !== '';

        if ($hasSchool || $hasBoard) {
            abort(403, 'Assessments are only available for independent teachers.');
        }
    }

    private function platformOnlyQuery(Request $request)
    {
        $query = Assessment::query()
            ->withCount('questions')
            ->whereNull('school_board')
            ->whereNull('school_id')
            ->whereNull('teacher_id')
            ->whereNull('archived_at')
            ->where('status', 'published')
            ->orderByDesc('created_at');

        $this->applyListFilters($query, $request, false);

        return $query;
    }

    private function resolvePlatformPublished(int $atelier, string $grade, string $rawGrade = ''): ?Assessment
    {
        return $this->firstForAssignableGrade(
            Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id'),
            $grade,
            $rawGrade
        );
    }

    private function boardSyncedQuery(string $boardCode, Request $request)
    {
        $archivedIds = BoardAssessmentArchive::query()
            ->where('school_board', $boardCode)
            ->pluck('assessment_id');

        $activeCopySourceIds = Assessment::query()
            ->where('school_board', $boardCode)
            ->whereNotIn('id', $archivedIds)
            ->whereNotNull('source_assessment_id')
            ->where('status', 'published')
            ->pluck('source_assessment_id');

        $query = Assessment::query()
            ->withCount('questions')
            ->where('status', 'published')
            ->where(function ($query) use ($boardCode, $archivedIds, $activeCopySourceIds) {
                $query->where(function ($q) use ($boardCode, $archivedIds) {
                    $q->where('school_board', $boardCode)
                        ->whereNotIn('id', $archivedIds);
                })->orWhere(function ($q) use ($archivedIds, $activeCopySourceIds) {
                    $q->whereNull('school_board')
                        ->whereNull('school_id')
                        ->whereNull('teacher_id')
                        ->whereNull('archived_at')
                        ->whereNotIn('id', $archivedIds)
                        ->when($activeCopySourceIds->isNotEmpty(), function ($inner) use ($activeCopySourceIds) {
                            $inner->whereNotIn('id', $activeCopySourceIds);
                        });
                });
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($query, $request, false);

        return $query;
    }

    private function authorizeTeacherAccess(Assessment $assessment, array $context): void
    {
        if ($context['board_code']) {
            $this->authorizeBoardViewAccess($assessment, $context['board_code']);

            return;
        }

        if ($context['school_id'] === null) {
            $this->authorizeTeacherScopeAccess($assessment, $context['teacher_id']);

            return;
        }

        $schoolId = $context['school_id'];

        if ($assessment->school_id !== null && $assessment->school_id !== $schoolId) {
            abort(403, 'This assessment belongs to another school.');
        }

        if ($assessment->school_board !== null) {
            abort(403, 'This assessment belongs to a school board.');
        }

        if ($assessment->isPlatformOriginal()) {
            if ($assessment->archived_at !== null) {
                abort(404, 'Assessment not found.');
            }

            $isSchoolArchived = SchoolAssessmentArchive::query()
                ->where('school_id', $schoolId)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isSchoolArchived) {
                abort(404, 'Assessment not found.');
            }

            $hasActiveSchoolCopy = Assessment::query()
                ->where('school_id', $schoolId)
                ->where('source_assessment_id', $assessment->id)
                ->whereNotIn('id', SchoolAssessmentArchive::query()
                    ->where('school_id', $schoolId)
                    ->pluck('assessment_id'))
                ->exists();

            if ($hasActiveSchoolCopy) {
                abort(404, 'Assessment not found.');
            }
        } else {
            $isSchoolArchived = SchoolAssessmentArchive::query()
                ->where('school_id', $schoolId)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isSchoolArchived) {
                abort(404, 'Assessment not found.');
            }
        }
    }

    private function authorizeTeacherScopeAccess(Assessment $assessment, int $teacherId): void
    {
        if ($assessment->teacher_id !== null && $assessment->teacher_id !== $teacherId) {
            abort(403, 'This assessment belongs to another teacher.');
        }

        if ($assessment->school_board !== null || $assessment->school_id !== null) {
            abort(403, 'This assessment belongs to another scope.');
        }

        if ($assessment->isPlatformOriginal()) {
            if ($assessment->archived_at !== null) {
                abort(404, 'Assessment not found.');
            }

            $isTeacherArchived = TeacherAssessmentArchive::query()
                ->where('teacher_id', $teacherId)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isTeacherArchived) {
                abort(404, 'Assessment not found.');
            }

            $hasActiveTeacherCopy = Assessment::query()
                ->where('teacher_id', $teacherId)
                ->where('source_assessment_id', $assessment->id)
                ->whereNotIn('id', TeacherAssessmentArchive::query()
                    ->where('teacher_id', $teacherId)
                    ->pluck('assessment_id'))
                ->exists();

            if ($hasActiveTeacherCopy) {
                abort(404, 'Assessment not found.');
            }

            return;
        }

        $isTeacherArchived = TeacherAssessmentArchive::query()
            ->where('teacher_id', $teacherId)
            ->where('assessment_id', $assessment->id)
            ->exists();

        if ($isTeacherArchived) {
            abort(404, 'Assessment not found.');
        }
    }

    private function authorizeBoardViewAccess(Assessment $assessment, string $boardCode): void
    {
        if (strtolower($assessment->status) !== 'published') {
            abort(404, 'Assessment not found.');
        }

        if ($assessment->school_board !== null && $assessment->school_board !== $boardCode) {
            abort(403, 'This assessment belongs to another school board.');
        }

        if ($assessment->isPlatformOriginal()) {
            if ($assessment->archived_at !== null) {
                abort(404, 'Assessment not found.');
            }

            $isBoardArchived = BoardAssessmentArchive::query()
                ->where('school_board', $boardCode)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isBoardArchived) {
                abort(404, 'Assessment not found.');
            }

            $hasActiveBoardCopy = Assessment::query()
                ->where('school_board', $boardCode)
                ->where('source_assessment_id', $assessment->id)
                ->where('status', 'published')
                ->whereNotIn('id', BoardAssessmentArchive::query()
                    ->where('school_board', $boardCode)
                    ->pluck('assessment_id'))
                ->exists();

            if ($hasActiveBoardCopy) {
                abort(404, 'Assessment not found.');
            }
        } else {
            $isBoardArchived = BoardAssessmentArchive::query()
                ->where('school_board', $boardCode)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isBoardArchived) {
                abort(404, 'Assessment not found.');
            }
        }
    }

    private function authorizePlatformAssessmentVisible(Assessment $assessment): void
    {
        if (! $assessment->isPlatformOriginal()) {
            return;
        }

        if ($assessment->archived_at !== null || strtolower($assessment->status) !== 'published') {
            abort(404, 'Assessment not found.');
        }
    }

    private function setActiveScopedAssessment(Assessment $assessment, int $scopeId, string $scope): void
    {
        if ($scope === 'teacher') {
            TeacherAssessmentArchive::query()
                ->where('teacher_id', $scopeId)
                ->where('assessment_id', $assessment->id)
                ->delete();

            $paired = $this->findPairedScopedAssessment($assessment, $scopeId, $scope);

            if ($paired) {
                TeacherAssessmentArchive::query()->firstOrCreate([
                    'teacher_id' => $scopeId,
                    'assessment_id' => $paired->id,
                ]);
            }

            return;
        }

        $this->setActiveAssessment($assessment, $scopeId);
    }

    private function findPairedScopedAssessment(Assessment $assessment, int $scopeId, string $scope): ?Assessment
    {
        if ($scope === 'teacher') {
            if ($assessment->teacher_id === $scopeId && $assessment->source_assessment_id) {
                return Assessment::query()->find($assessment->source_assessment_id);
            }

            if ($assessment->isPlatformOriginal()) {
                return Assessment::query()
                    ->where('teacher_id', $scopeId)
                    ->where('source_assessment_id', $assessment->id)
                    ->first();
            }

            return null;
        }

        return $this->findPairedAssessment($assessment, $scopeId);
    }

    private function resolveTeacherPublished(int $teacherId, int $atelier, string $grade, string $rawGrade = ''): ?Assessment
    {
        $archivedIds = TeacherAssessmentArchive::query()
            ->where('teacher_id', $teacherId)
            ->pluck('assessment_id');

        $copy = $this->firstForAssignableGrade(
            Assessment::query()
                ->where('teacher_id', $teacherId)
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id')
                ->whereNotIn('id', $archivedIds),
            $grade,
            $rawGrade
        );

        if ($copy) {
            return $copy;
        }

        $hasActiveTeacherCopy = Assessment::query()
            ->where('teacher_id', $teacherId)
            ->where('source_assessment_id', '>', 0)
            ->where('atelier', $atelier)
            ->where(function ($q) use ($grade, $rawGrade) {
                $this->applyGradeMatchScope($q, $grade, $rawGrade);
            })
            ->whereNotIn('id', $archivedIds)
            ->exists();

        if ($hasActiveTeacherCopy) {
            return null;
        }

        return $this->firstForAssignableGrade(
            Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id'),
            $grade,
            $rawGrade
        );
    }

    private function setActiveAssessment(Assessment $assessment, int $schoolId): void
    {
        SchoolAssessmentArchive::query()
            ->where('school_id', $schoolId)
            ->where('assessment_id', $assessment->id)
            ->delete();

        $paired = $this->findPairedAssessment($assessment, $schoolId);

        if ($paired) {
            SchoolAssessmentArchive::query()->firstOrCreate([
                'school_id' => $schoolId,
                'assessment_id' => $paired->id,
            ]);
        }
    }

    private function findPairedAssessment(Assessment $assessment, int $schoolId): ?Assessment
    {
        if ($assessment->school_id === $schoolId && $assessment->source_assessment_id) {
            return Assessment::query()->find($assessment->source_assessment_id);
        }

        if ($assessment->isPlatformOriginal()) {
            return Assessment::query()
                ->where('school_id', $schoolId)
                ->where('source_assessment_id', $assessment->id)
                ->first();
        }

        return null;
    }

    private function resolveBoardPublished(string $boardCode, int $atelier, string $grade, string $rawGrade = ''): ?Assessment
    {
        $archivedIds = BoardAssessmentArchive::query()
            ->where('school_board', $boardCode)
            ->pluck('assessment_id');

        $copy = $this->firstForAssignableGrade(
            Assessment::query()
                ->where('school_board', $boardCode)
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id')
                ->whereNotIn('id', $archivedIds),
            $grade,
            $rawGrade
        );

        if ($copy) {
            return $copy;
        }

        $hasActiveBoardCopy = Assessment::query()
            ->where('school_board', $boardCode)
            ->where('source_assessment_id', '>', 0)
            ->where('atelier', $atelier)
            ->where(function ($q) use ($grade, $rawGrade) {
                $this->applyGradeMatchScope($q, $grade, $rawGrade);
            })
            ->where('status', 'published')
            ->whereNotIn('id', $archivedIds)
            ->exists();

        if ($hasActiveBoardCopy) {
            return null;
        }

        return $this->firstForAssignableGrade(
            Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id')
                ->whereNotIn('id', $archivedIds),
            $grade,
            $rawGrade
        );
    }

    private function resolveSchoolPublished(int $schoolId, int $atelier, string $grade, string $rawGrade = ''): ?Assessment
    {
        $archivedIds = SchoolAssessmentArchive::query()
            ->where('school_id', $schoolId)
            ->pluck('assessment_id');

        $copy = $this->firstForAssignableGrade(
            Assessment::query()
                ->where('school_id', $schoolId)
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id')
                ->whereNotIn('id', $archivedIds),
            $grade,
            $rawGrade
        );

        if ($copy) {
            return $copy;
        }

        $hasActiveSchoolCopy = Assessment::query()
            ->where('school_id', $schoolId)
            ->where('source_assessment_id', '>', 0)
            ->where('atelier', $atelier)
            ->where(function ($q) use ($grade, $rawGrade) {
                $this->applyGradeMatchScope($q, $grade, $rawGrade);
            })
            ->whereNotIn('id', $archivedIds)
            ->exists();

        if ($hasActiveSchoolCopy) {
            return null;
        }

        return $this->firstForAssignableGrade(
            Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->where('status', 'published')
                ->whereNotNull('template_id'),
            $grade,
            $rawGrade
        );
    }

    /**
     * Prefer class-type grade, then assessment band, then Assign to All.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Assessment>  $query
     */
    private function firstForAssignableGrade($query, string $grade, string $rawGrade = ''): ?Assessment
    {
        foreach ($this->gradeLookupOrder($grade, $rawGrade) as $candidate) {
            $match = (clone $query)->where('grade', $candidate)->orderByDesc('updated_at')->first();
            if ($match) {
                return $match;
            }
        }

        return (clone $query)->where('grade', self::GRADE_ALL)->orderByDesc('updated_at')->first();
    }

    /** @return list<string> */
    private function gradeLookupOrder(string $grade, string $rawGrade = ''): array
    {
        return array_values(array_unique(array_filter(
            [$rawGrade, $grade],
            fn ($value) => is_string($value) && $value !== '' && $value !== self::GRADE_ALL
        )));
    }

    private function applyGradeMatchScope($query, string $grade, string $rawGrade = ''): void
    {
        $values = array_values(array_unique(array_filter(
            [$rawGrade, $grade, self::GRADE_ALL],
            fn ($value) => is_string($value) && $value !== ''
        )));

        $query->whereIn('grade', $values);
    }

    private function applyListFilters($query, Request $request, bool $includeStatus): void
    {
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(atelier AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhere('unit', 'like', "%{$search}%");
            });
        }

        $gradeFilter = $request->string('grade')->toString();
        if ($gradeFilter !== '' && $gradeFilter !== 'all') {
            $dbGrade = self::GRADE_FILTER_MAP[$gradeFilter] ?? null;
            if ($dbGrade) {
                $query->where(function ($q) use ($dbGrade) {
                    $q->where('grade', $dbGrade)->orWhere('grade', self::GRADE_ALL);
                });
            } else {
                $query->whereRaw('0 = 1');
            }
        }

        if ($includeStatus) {
            $statusFilter = $request->string('status')->toString();
            if ($statusFilter !== '' && $statusFilter !== 'all') {
                $query->where('status', strtolower($statusFilter));
            }
        }
    }

    /** @param array<string, mixed> $data */
    private function applyAssessmentData(Assessment $assessment, array $data): void
    {
        $usesTemplate = ! empty($data['template_id']);

        $assessment->update([
            'title' => $data['title'],
            'unit' => $data['unit'] ?? null,
            'atelier' => $data['atelier'],
            'grade' => $data['grade'],
            'status' => strtolower($data['status']),
            'template_id' => $usesTemplate ? $data['template_id'] : null,
            'template_draft' => $usesTemplate ? ($data['template_draft'] ?? null) : null,
        ]);

        if ($usesTemplate) {
            $assessment->questions()->delete();
        } else {
            $this->syncQuestions($assessment, $data['questions']);
        }
    }

    /** @return array<string, mixed> */
    private function validateAssessment(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:50'],
            'atelier' => ['required', 'integer', 'min:1', 'max:15'],
            'grade' => ['required', 'string', Rule::in(self::GRADES)],
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
    private function formatDetail(
        Assessment $assessment,
        ?string $boardCode,
        bool $archived = false,
        bool $editableScope = false,
        ?int $scopeId = null,
        string $scope = 'school'
    ): array {
        return [
            ...$this->format($assessment, $boardCode, $archived, $editableScope, $scopeId, $scope),
            'template_draft' => $assessment->template_draft,
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function format(
        Assessment $assessment,
        ?string $boardCode,
        bool $archived = false,
        bool $editableScope = false,
        ?int $scopeId = null,
        string $scope = 'school'
    ): array {
        $questionCount = (int) ($assessment->questions_count ?? $assessment->questions()->count());
        $status = strtolower($assessment->status);
        $isBoardCopy = $boardCode !== null && $assessment->school_board === $boardCode;
        $isSchoolCopy = $editableScope && $scope === 'school' && $scopeId !== null && $assessment->school_id === $scopeId;
        $isTeacherCopy = $editableScope && $scope === 'teacher' && $scopeId !== null && $assessment->teacher_id === $scopeId;
        $usesTemplate = ! empty($assessment->template_id);

        $ownership = 'platform';
        if ($isBoardCopy) {
            $ownership = 'board_copy';
        } elseif ($isSchoolCopy) {
            $ownership = 'school_copy';
        } elseif ($isTeacherCopy) {
            $ownership = 'teacher_copy';
        }

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => $status,
            'question_count' => $usesTemplate ? 0 : $questionCount,
            'template_id' => $assessment->template_id,
            'assigned_to' => $this->assignedTo($status, $questionCount, $isBoardCopy, $isSchoolCopy, $isTeacherCopy, $usesTemplate),
            'ownership' => $ownership,
            'source_assessment_id' => $assessment->source_assessment_id,
            'archived' => $archived,
            'created' => $assessment->created_at?->toDateString() ?? '',
        ];
    }

    private function assignedTo(
        string $status,
        int $questionCount,
        bool $isBoardCopy,
        bool $isSchoolCopy,
        bool $isTeacherCopy,
        bool $usesTemplate = false
    ): string {
        if ($isBoardCopy) {
            return 'board_only';
        }

        if ($isSchoolCopy) {
            return 'school_only';
        }

        if ($isTeacherCopy) {
            return 'teacher_only';
        }

        if ($status === 'published') {
            return 'all_schools';
        }

        if ($usesTemplate || $questionCount > 0) {
            return 'selected';
        }

        return 'not_assigned';
    }

    /** @return array{code: string, name: string}|null */
    private function formatSchoolBoard(?string $boardCode): ?array
    {
        if (! $boardCode) {
            return null;
        }

        $board = SchoolBoard::query()->where('code', $boardCode)->first();

        return [
            'code' => $boardCode,
            'name' => $board?->name ?? $boardCode,
        ];
    }

    /** @return array{id: int, name: string}|null */
    private function formatSchool(?School $school): ?array
    {
        if (! $school) {
            return null;
        }

        return [
            'id' => $school->id,
            'name' => $school->name,
        ];
    }

    private function normalizeGrade(mixed $grade): string
    {
        if (! is_string($grade) || trim($grade) === '') {
            return '';
        }

        $trimmed = trim($grade);

        return self::GRADE_ALIASES[$trimmed]
            ?? \App\Models\ClassType::resolveAssessmentGrade($trimmed);
    }
}
