<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailBlast;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminEmailBlastController extends Controller
{
    /** @var list<string> */
    private const TEACHER_FILTERS = ['subscription', 'essentials', 'insights', 'trial'];

    /** @var list<string> */
    private const INSTITUTIONAL_FILTERS = ['subscription', 'trial'];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $blasts = EmailBlast::query()
            ->with('creator:id,name,first_name,last_name,email')
            ->latest()
            ->limit(30)
            ->get();

        return response()->json([
            'blasts' => $blasts->map(fn (EmailBlast $blast) => $this->format($blast)),
            'audiences' => collect(EmailBlast::AUDIENCES)->map(fn (string $label, string $key) => [
                'value' => $key,
                'label' => $label,
            ])->values(),
            'recipient_counts' => $this->recipientCounts(),
            'filter_options' => [
                'teachers' => [
                    ['value' => 'subscription', 'label' => 'With subscription'],
                    ['value' => 'essentials', 'label' => 'Essentials'],
                    ['value' => 'insights', 'label' => 'Insights'],
                    ['value' => 'trial', 'label' => 'Trial accounts'],
                ],
                'school' => [
                    ['value' => 'subscription', 'label' => 'With subscription'],
                    ['value' => 'trial', 'label' => 'Trial accounts only'],
                ],
                'board' => [
                    ['value' => 'subscription', 'label' => 'With subscription'],
                    ['value' => 'trial', 'label' => 'Trial accounts only'],
                ],
            ],
        ]);
    }

    public function previewCount(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'audiences' => ['required', 'array', 'min:1'],
            'audiences.*' => ['required', 'string', 'in:'.implode(',', array_keys(EmailBlast::AUDIENCES))],
            'audience_filters' => ['sometimes', 'array'],
        ]);

        $audiences = array_values(array_unique($data['audiences']));
        $filters = $this->normalizeAudienceFilters($data['audience_filters'] ?? [], $audiences);

        return response()->json([
            'count' => $this->matchingUsersQuery($audiences, $filters)->count(),
            'recipient_counts' => $this->recipientCounts(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body_html' => ['required', 'string', 'max:500000'],
            'audiences' => ['required', 'array', 'min:1'],
            'audiences.*' => ['required', 'string', 'in:'.implode(',', array_keys(EmailBlast::AUDIENCES))],
            'audience_filters' => ['sometimes', 'array'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => [
                'file',
                'max:10240',
                'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,png,jpg,jpeg,gif,webp,txt,csv,zip',
            ],
        ]);

        $audiences = array_values(array_unique($data['audiences']));
        $filters = $this->normalizeAudienceFilters(
            $this->parseAudienceFiltersInput($request),
            $audiences
        );

        $storedAttachments = [];

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                if (! $file) {
                    continue;
                }
                $path = $file->storeAs(
                    'email-blasts/'.now()->format('Ymd'),
                    uniqid('blast_', true).'_'.$file->getClientOriginalName(),
                    'local'
                );
                $storedAttachments[] = [
                    'path' => $path,
                    'name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }

        $blast = EmailBlast::query()->create([
            'created_by' => $request->user()->id,
            'subject' => trim($data['subject']),
            'body_html' => $data['body_html'],
            'audiences' => $audiences,
            'audience_filters' => $filters,
            'attachments' => $storedAttachments,
        ]);

        $attachmentPaths = collect($storedAttachments)
            ->map(fn (array $item) => Storage::disk('local')->path($item['path']))
            ->filter(fn (string $path) => is_readable($path))
            ->values()
            ->all();

        $delivery = $this->deliver($blast, $audiences, $filters, $attachmentPaths);

        $blast->forceFill([
            'delivered_count' => (int) ($delivery['totals']['accounts'] ?? 0),
            'email_sent' => (int) ($delivery['totals']['email_sent'] ?? 0),
            'email_skipped' => (int) ($delivery['totals']['email_skipped'] ?? 0),
            'email_failed' => (int) ($delivery['totals']['email_failed'] ?? 0),
        ])->save();

        try {
            AuditLogger::log(
                'Create',
                'Email Blast',
                "Email blast \"{$blast->subject}\" sent to {$blast->delivered_count} account(s)",
                'info',
                $request,
                subject: $request->user(),
                metadata: [
                    'email_blast_id' => $blast->id,
                    'audiences' => $audiences,
                    'audience_filters' => $filters,
                    'email_sent' => $blast->email_sent,
                    'email_failed' => $blast->email_failed,
                ],
            );
        } catch (Throwable $e) {
            Log::warning('Email blast audit log failed', ['error' => $e->getMessage()]);
        }

        $labels = implode(', ', $blast->audienceLabels());
        $sent = $blast->email_sent;

        return response()->json([
            'blast' => $this->format($blast->fresh()->load('creator:id,name,first_name,last_name,email')),
            'delivery' => $delivery,
            'message' => $blast->delivered_count > 0
                ? "Email blast sent to {$blast->delivered_count} account(s) ({$labels}) — {$sent} delivered."
                : "No matching accounts found for {$labels}.",
        ], 201);
    }

    /**
     * @param  list<string>  $audiences
     * @param  array<string, list<string>>  $filters
     * @param  list<string>  $attachmentPaths
     * @return array{
     *   totals: array{accounts: int, email_sent: int, email_skipped: int, email_failed: int, failed: int},
     *   recipients: list<array{id: int, name: string, email: string, role: string, email_sent: bool, email_status: string}>
     * }
     */
    private function deliver(EmailBlast $blast, array $audiences, array $filters, array $attachmentPaths): array
    {
        $recipients = [];
        $emailSent = 0;
        $emailSkipped = 0;
        $emailFailed = 0;
        $failed = 0;

        $this->matchingUsersQuery($audiences, $filters)
            ->orderBy('id')
            ->chunkById(100, function ($users) use (
                $blast,
                $attachmentPaths,
                &$recipients,
                &$emailSent,
                &$emailSkipped,
                &$emailFailed,
                &$failed
            ) {
                foreach ($users as $user) {
                    try {
                        $status = NotificationMailer::sendEmailBlast(
                            $user,
                            $blast->subject,
                            $blast->body_html,
                            $attachmentPaths,
                        );
                        $sent = $status === 'sent';
                        if ($sent) {
                            $emailSent++;
                        } elseif ($status === 'failed') {
                            $emailFailed++;
                        } else {
                            $emailSkipped++;
                        }
                        $recipients[] = [
                            'id' => $user->id,
                            'name' => $user->displayName(),
                            'email' => (string) $user->email,
                            'role' => (string) $user->role,
                            'email_sent' => $sent,
                            'email_status' => $status,
                        ];
                    } catch (Throwable $e) {
                        $failed++;
                        $emailFailed++;
                        Log::error('Email blast delivery failed', [
                            'blast_id' => $blast->id,
                            'user_id' => $user->id,
                            'error' => $e->getMessage(),
                        ]);
                        $recipients[] = [
                            'id' => $user->id,
                            'name' => $user->displayName(),
                            'email' => (string) $user->email,
                            'role' => (string) $user->role,
                            'email_sent' => false,
                            'email_status' => 'failed',
                        ];
                    }
                }
            });

        return [
            'totals' => [
                'accounts' => count($recipients),
                'email_sent' => $emailSent,
                'email_skipped' => $emailSkipped,
                'email_failed' => $emailFailed,
                'failed' => $failed,
            ],
            'recipients' => $recipients,
        ];
    }

    /**
     * @param  list<string>  $audiences
     * @param  array<string, list<string>>  $filters
     */
    private function matchingUsersQuery(array $audiences, array $filters): Builder
    {
        $query = User::query()->whereIn('account_status', ['active', 'pending', 'inactive']);

        $query->where(function (Builder $outer) use ($audiences, $filters) {
            foreach ($audiences as $audience) {
                $role = match ($audience) {
                    'school' => 'school_admin',
                    'board' => 'board_admin',
                    default => 'teacher',
                };
                $audienceFilters = $filters[$audience] ?? [];

                $outer->orWhere(function (Builder $inner) use ($role, $audience, $audienceFilters) {
                    $inner->where('role', $role);
                    $this->applyAudienceFilters($inner, $audience, $audienceFilters);
                });
            }
        });

        return $query;
    }

    /** @param  list<string>  $filters */
    private function applyAudienceFilters(Builder $query, string $audience, array $filters): void
    {
        if ($filters === []) {
            return;
        }

        $query->where(function (Builder $q) use ($audience, $filters) {
            foreach ($filters as $filter) {
                $q->orWhere(function (Builder $sub) use ($audience, $filter) {
                    if ($audience === 'teachers') {
                        $this->applyTeacherFilter($sub, $filter);
                    } else {
                        $this->applyInstitutionalFilter($sub, $filter);
                    }
                });
            }
        });
    }

    private function applyTeacherFilter(Builder $query, string $filter): void
    {
        $paidPlans = ['essentials', 'insights'];

        match ($filter) {
            'subscription' => $query
                ->whereIn('subscription_status', ['active', 'past_due'])
                ->whereIn('subscription_plan', $paidPlans)
                ->where(function (Builder $q) {
                    $q->whereNull('subscription_ends_at')
                        ->orWhere('subscription_ends_at', '>', now());
                }),
            'essentials' => $query
                ->whereIn('subscription_status', ['active', 'past_due'])
                ->where('subscription_plan', 'essentials')
                ->where(function (Builder $q) {
                    $q->whereNull('subscription_ends_at')
                        ->orWhere('subscription_ends_at', '>', now());
                }),
            'insights' => $query
                ->whereIn('subscription_status', ['active', 'past_due'])
                ->where('subscription_plan', 'insights')
                ->where(function (Builder $q) {
                    $q->whereNull('subscription_ends_at')
                        ->orWhere('subscription_ends_at', '>', now());
                }),
            'trial' => $query
                ->where('subscription_status', 'trialing')
                ->whereNotNull('trial_ends_at')
                ->where('trial_ends_at', '>', now())
                ->where(function (Builder $q) {
                    $q->whereNull('subscription_plan')
                        ->orWhereNotIn('subscription_plan', ['institutional']);
                })
                ->where(function (Builder $q) {
                    $q->whereNull('affiliation_type')
                        ->orWhere('affiliation_type', 'individual');
                })
                ->where(function (Builder $q) {
                    $q->whereNull('registration_source')
                        ->orWhereNotIn('registration_source', [
                            'school_registration',
                            'board_registration',
                            'school_assigned',
                            'board_assigned',
                        ]);
                }),
            default => $query->whereRaw('1 = 0'),
        };
    }

    private function applyInstitutionalFilter(Builder $query, string $filter): void
    {
        match ($filter) {
            'subscription' => $query
                ->whereIn('subscription_status', ['active', 'past_due'])
                ->where(function (Builder $q) {
                    $q->whereNull('subscription_ends_at')
                        ->orWhere('subscription_ends_at', '>', now());
                }),
            'trial' => $query
                ->where('subscription_status', 'trialing')
                ->whereNotNull('trial_ends_at')
                ->where('trial_ends_at', '>', now()),
            default => $query->whereRaw('1 = 0'),
        };
    }

    private function recipientCounts(): array
    {
        $base = fn () => User::query()->whereIn('account_status', ['active', 'pending', 'inactive']);

        $teacherAll = (clone $base())->where('role', 'teacher');
        $schoolAll = (clone $base())->where('role', 'school_admin');
        $boardAll = (clone $base())->where('role', 'board_admin');

        return [
            'teachers' => [
                'all' => (clone $teacherAll)->count(),
                'subscription' => $this->countWithFilter('teachers', ['subscription']),
                'essentials' => $this->countWithFilter('teachers', ['essentials']),
                'insights' => $this->countWithFilter('teachers', ['insights']),
                'trial' => $this->countWithFilter('teachers', ['trial']),
            ],
            'school' => [
                'all' => (clone $schoolAll)->count(),
                'subscription' => $this->countWithFilter('school', ['subscription']),
                'trial' => $this->countWithFilter('school', ['trial']),
            ],
            'board' => [
                'all' => (clone $boardAll)->count(),
                'subscription' => $this->countWithFilter('board', ['subscription']),
                'trial' => $this->countWithFilter('board', ['trial']),
            ],
        ];
    }

    /** @param  list<string>  $filters */
    private function countWithFilter(string $audience, array $filters): int
    {
        return $this->matchingUsersQuery([$audience], [$audience => $filters])->count();
    }

    /**
     * @param  array<string, mixed>  $raw
     * @param  list<string>  $audiences
     * @return array<string, list<string>>
     */
    private function normalizeAudienceFilters(array $raw, array $audiences): array
    {
        $normalized = [];

        foreach ($audiences as $audience) {
            $allowed = $audience === 'teachers' ? self::TEACHER_FILTERS : self::INSTITUTIONAL_FILTERS;
            $values = $raw[$audience] ?? [];
            if (! is_array($values)) {
                $values = [$values];
            }

            $clean = [];
            foreach ($values as $value) {
                if (! is_string($value) && ! is_numeric($value)) {
                    continue;
                }
                $value = trim((string) $value);
                if ($value === '') {
                    continue;
                }
                if (! in_array($value, $allowed, true)) {
                    throw ValidationException::withMessages([
                        "audience_filters.{$audience}" => ["Invalid filter \"{$value}\" for {$audience}."],
                    ]);
                }
                $clean[] = $value;
            }

            $clean = array_values(array_unique($clean));
            if ($clean !== []) {
                $normalized[$audience] = $clean;
            }
        }

        return $normalized;
    }

    /** @return array<string, list<string>> */
    private function parseAudienceFiltersInput(Request $request): array
    {
        $raw = $request->input('audience_filters', []);

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }

        if (! is_array($raw)) {
            return [];
        }

        // FormData style: audience_filters[teachers][]=trial
        $out = [];
        foreach ($raw as $audience => $values) {
            if (! is_string($audience)) {
                continue;
            }
            if (! is_array($values)) {
                $values = [$values];
            }
            $out[$audience] = array_values(array_filter(array_map(
                fn ($v) => is_string($v) ? $v : (is_scalar($v) ? (string) $v : ''),
                $values
            )));
        }

        return $out;
    }

    public function clearAll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $blasts = EmailBlast::query()->get();
        $deleted = $blasts->count();

        foreach ($blasts as $blast) {
            foreach ($blast->attachments ?? [] as $attachment) {
                $path = is_array($attachment) ? ($attachment['path'] ?? null) : $attachment;
                if (is_string($path) && $path !== '' && Storage::disk('local')->exists($path)) {
                    Storage::disk('local')->delete($path);
                }
            }
        }

        EmailBlast::query()->delete();

        try {
            AuditLogger::log(
                'Delete',
                'Content',
                "Cleared {$deleted} email blast(s)",
                'warning',
                $request,
                subject: $request->user(),
            );
        } catch (Throwable $e) {
            Log::warning('Email blast clear audit log failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => $deleted === 0
                ? 'No email blasts to clear.'
                : "Cleared {$deleted} email blast".($deleted === 1 ? '' : 's').'.',
            'deleted' => $deleted,
        ]);
    }

    private function format(EmailBlast $blast): array
    {
        return [
            'id' => $blast->id,
            'subject' => $blast->subject,
            'audiences' => $blast->audiences ?? [],
            'audience_filters' => $blast->audience_filters ?? [],
            'audience_labels' => $blast->audienceLabels(),
            'attachment_count' => count($blast->attachments ?? []),
            'attachments' => collect($blast->attachments ?? [])->map(fn (array $a) => [
                'name' => $a['name'] ?? 'file',
                'size' => $a['size'] ?? null,
            ])->values()->all(),
            'delivered_count' => $blast->delivered_count,
            'email_sent' => $blast->email_sent,
            'email_skipped' => $blast->email_skipped,
            'email_failed' => $blast->email_failed,
            'created_at' => $blast->created_at?->toIso8601String(),
            'created_by' => $blast->creator?->displayName(),
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
