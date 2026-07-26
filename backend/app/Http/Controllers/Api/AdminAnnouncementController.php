<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemAnnouncement;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use App\Services\TeacherNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnnouncementController extends Controller
{
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
        ]);

        $announcement = SystemAnnouncement::query()->create([
            'created_by' => $request->user()->id,
            'category' => $data['category'],
            'title' => $data['title'],
            'message' => $data['message'],
            'url' => $data['url'] ?: null,
            'audience' => 'all',
            'published_at' => now(),
        ]);

        $delivered = 0;

        User::query()
            ->where('role', 'teacher')
            ->whereIn('account_status', ['active', 'pending'])
            ->orderBy('id')
            ->chunkById(100, function ($teachers) use ($announcement, &$delivered) {
                foreach ($teachers as $teacher) {
                    TeacherNotificationService::systemAnnouncement($teacher, $announcement);
                    $delivered++;
                }
            });

        User::query()
            ->whereIn('role', ['school_admin', 'board_admin'])
            ->whereIn('account_status', ['active', 'inactive'])
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($announcement, &$delivered) {
                foreach ($users as $user) {
                    NotificationMailer::sendAnnouncement($user, $announcement);
                    $delivered++;
                }
            });

        $announcement->forceFill(['delivered_count' => $delivered])->save();

        AuditLogger::log(
            'Create',
            'Announcement',
            "Broadcast \"{$announcement->title}\" to {$delivered} accounts",
            'info',
            $request,
            subject: $request->user(),
            metadata: ['announcement_id' => $announcement->id, 'category' => $announcement->category],
        );

        return response()->json([
            'announcement' => $this->format($announcement->fresh()->load('creator:id,name,first_name,last_name,email')),
            'message' => "Announcement sent to {$delivered} teacher, school, and board accounts.",
        ], 201);
    }

    private function format(SystemAnnouncement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'category' => $announcement->category,
            'category_label' => $announcement->categoryLabel(),
            'title' => $announcement->title,
            'message' => $announcement->message,
            'url' => $announcement->url,
            'audience' => $announcement->audience,
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
