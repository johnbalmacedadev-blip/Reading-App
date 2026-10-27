<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemAnnouncement;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TeacherNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminAnnouncementController extends Controller
{
    public const AUDIENCES = [
        'teachers' => 'Teachers',
        'school' => 'Schools',
        'board' => 'School Boards',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $announcements = SystemAnnouncement::query()
            ->with('creator:id,name,first_name,last_name,email')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'announcements' => $announcements->map(fn (SystemAnnouncement $item) => $this->format($item)),
            'categories' => collect(SystemAnnouncement::CATEGORIES)->map(fn (string $key) => [
                'value' => $key,
                'label' => (new SystemAnnouncement(['category' => $key]))->categoryLabel(),
            ])->values(),
            'audiences' => collect(self::AUDIENCES)->map(fn (string $label, string $key) => [
                'value' => $key,
                'label' => $label,
            ])->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'category' => ['required', 'in:'.implode(',', SystemAnnouncement::CATEGORIES)],
            'title' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:2000'],
            'url' => ['nullable', 'string', 'max:255'],
            'audience' => ['required', 'in:'.implode(',', array_keys(self::AUDIENCES))],
            'send_portal' => ['sometimes', 'boolean'],
            'send_email' => ['sometimes', 'boolean'],
        ]);

        $sendPortal = $request->boolean('send_portal', true);
        $sendEmail = $request->boolean('send_email', true);

        if (! $sendPortal && ! $sendEmail) {
            return response()->json([
                'message' => 'Select at least one delivery channel: Portal or Email.',
            ], 422);
        }

        $audience = $data['audience'];

        $announcement = SystemAnnouncement::query()->create([
            'created_by' => $request->user()->id,
            'category' => $data['category'],
            'title' => $data['title'],
            'message' => $data['message'],
            'url' => filled($data['url'] ?? null) ? trim((string) $data['url']) : null,
            'audience' => $audience,
            'published_at' => now(),
        ]);

        $delivery = $this->deliverToAudience($announcement, $audience, $sendPortal, $sendEmail);
        $delivered = (int) ($delivery['totals']['accounts'] ?? 0);

        $announcement->forceFill(['delivered_count' => $delivered])->save();

        try {
            AuditLogger::log(
                'Create',
                'Announcement',
                "Broadcast \"{$announcement->title}\" to {$delivered} {$audience} account(s)",
                'info',
                $request,
                subject: $request->user(),
                metadata: [
                    'announcement_id' => $announcement->id,
                    'category' => $announcement->category,
                    'audience' => $audience,
                    'delivered_count' => $delivered,
                    'portal_sent' => $delivery['totals']['portal_sent'] ?? 0,
                    'email_sent' => $delivery['totals']['email_sent'] ?? 0,
                ],
            );
        } catch (Throwable $e) {
            Log::warning('Announcement audit log failed', ['error' => $e->getMessage()]);
        }

        $label = self::AUDIENCES[$audience] ?? $audience;
        $portalSent = (int) ($delivery['totals']['portal_sent'] ?? 0);
        $emailSent = (int) ($delivery['totals']['email_sent'] ?? 0);

        return response()->json([
            'announcement' => $this->format($announcement->fresh()->load('creator:id,name,first_name,last_name,email')),
            'delivery' => $delivery,
            'message' => $delivered > 0
                ? "Announcement sent to {$delivered} {$label} account(s) — {$portalSent} portal, {$emailSent} email."
                : "Announcement saved, but no matching {$label} accounts were found to notify.",
        ], 201);
    }

    /**
     * @return array{
     *   totals: array{accounts: int, portal_sent: int, email_sent: int, email_skipped: int, email_failed: int, failed: int},
     *   recipients: list<array{id: int, name: string, email: string, portal_sent: bool, email_sent: bool, email_status: string}>
     * }
     */
    private function deliverToAudience(
        SystemAnnouncement $announcement,
        string $audience,
        bool $sendPortal = true,
        bool $sendEmail = true,
    ): array {
        $roles = match ($audience) {
            'school' => ['school_admin'],
            'board' => ['board_admin'],
            default => ['teacher'],
        };

        $recipients = [];
        $portalSent = 0;
        $emailSent = 0;
        $emailSkipped = 0;
        $emailFailed = 0;
        $failed = 0;

        User::query()
            ->whereIn('role', $roles)
            ->whereIn('account_status', ['active', 'pending', 'inactive'])
            ->orderBy('id')
            ->chunkById(100, function ($users) use (
                $announcement,
                $sendPortal,
                $sendEmail,
                &$recipients,
                &$portalSent,
                &$emailSent,
                &$emailSkipped,
                &$emailFailed,
                &$failed
            ) {
                foreach ($users as $user) {
                    try {
                        $row = TeacherNotificationService::systemAnnouncement(
                            $user,
                            $announcement,
                            $sendPortal,
                            $sendEmail,
                        );
                        $recipients[] = $row;
                        if ($row['portal_sent']) {
                            $portalSent++;
                        }
                        if ($row['email_sent']) {
                            $emailSent++;
                        } elseif ($row['email_status'] === 'failed') {
                            $emailFailed++;
                        } elseif (in_array($row['email_status'], ['skipped', 'not_attempted'], true)) {
                            $emailSkipped++;
                        }
                    } catch (Throwable $e) {
                        $failed++;
                        Log::error('Announcement delivery failed', [
                            'announcement_id' => $announcement->id,
                            'user_id' => $user->id,
                            'error' => $e->getMessage(),
                        ]);
                        $recipients[] = [
                            'id' => $user->id,
                            'name' => $user->displayName(),
                            'email' => (string) $user->email,
                            'portal_sent' => false,
                            'email_sent' => false,
                            'email_status' => 'failed',
                        ];
                    }
                }
            });

        return [
            'totals' => [
                'accounts' => count($recipients),
                'portal_sent' => $portalSent,
                'email_sent' => $emailSent,
                'email_skipped' => $emailSkipped,
                'email_failed' => $emailFailed,
                'failed' => $failed,
            ],
            'recipients' => $recipients,
        ];
    }

    public function clearAll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $deleted = SystemAnnouncement::query()->count();
        SystemAnnouncement::query()->delete();

        try {
            AuditLogger::log(
                'Delete',
                'Announcement',
                "Cleared {$deleted} broadcast announcement(s)",
                'warning',
                $request,
                subject: $request->user(),
            );
        } catch (Throwable $e) {
            Log::warning('Announcement clear audit log failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => $deleted === 0
                ? 'No broadcasts to clear.'
                : "Cleared {$deleted} broadcast".($deleted === 1 ? '' : 's').'.',
            'deleted' => $deleted,
        ]);
    }

    private function format(SystemAnnouncement $announcement): array
    {
        $audience = (string) ($announcement->audience ?: 'teachers');
        if ($audience === 'all') {
            $audience = 'teachers';
        }

        return [
            'id' => $announcement->id,
            'category' => $announcement->category,
            'category_label' => $announcement->categoryLabel(),
            'title' => $announcement->title,
            'message' => $announcement->message,
            'url' => $announcement->url,
            'audience' => $audience,
            'audience_label' => self::AUDIENCES[$audience] ?? ucfirst($audience),
            'delivered_count' => $announcement->delivered_count,
            'published_at' => $announcement->published_at?->toIso8601String(),
            'created_by' => $announcement->creator?->displayName(),
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
