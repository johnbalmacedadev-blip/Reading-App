<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\TeacherNotification;
use App\Models\User;
use App\Services\TeacherNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);
        TeacherNotificationService::trialStarted($teacher);
        if ($teacher->hasActiveTrial() && ! $teacher->isInstitutionalTeacher()) {
            $daysLeft = $teacher->trialDaysRemaining();
            if (in_array($daysLeft, PlatformSetting::trialReminderDaysLeft(), true)) {
                TeacherNotificationService::trialEndingSoon($teacher, $daysLeft);
            }
        } elseif (
            PlatformSetting::trialExpiredEmailEnabled()
            && $teacher->trial_ends_at
            && $teacher->trial_ends_at->isPast()
            && ! $teacher->hasActiveSubscription()
            && ! $teacher->isInstitutionalTeacher()
        ) {
            TeacherNotificationService::trialExpired($teacher);
        }
        if (
            in_array($teacher->subscription_status, ['canceled', 'cancelled', 'unpaid'], true)
            && $teacher->subscription_ends_at
            && $teacher->subscription_ends_at->isFuture()
            && $teacher->subscription_ends_at->lte(now()->addDays(7))
        ) {
            TeacherNotificationService::subscriptionExpiring($teacher);
        }
        if (
            $teacher->subscription_ends_at
            && $teacher->subscription_ends_at->isPast()
            && ! $teacher->hasActiveSubscription()
            && ! $teacher->isInstitutionalTeacher()
        ) {
            TeacherNotificationService::subscriptionExpired($teacher);
        }
        $notifications = TeacherNotification::query()
            ->where('teacher_id', $teacher->id)
            ->whereNull('dismissed_at')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'notifications' => $notifications->map(fn (TeacherNotification $notification) => $this->format($notification)),
            'unread_count' => TeacherNotification::query()
                ->where('teacher_id', $teacher->id)
                ->whereNull('dismissed_at')
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    public function markRead(Request $request, TeacherNotification $notification): JsonResponse
    {
        $teacher = $this->teacher($request);
        $this->authorizeNotification($notification, $teacher);

        if (! $notification->read_at) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        return response()->json(['notification' => $this->format($notification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $teacher = $this->teacher($request);

        TeacherNotification::query()
            ->where('teacher_id', $teacher->id)
            ->whereNull('dismissed_at')
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function destroy(Request $request, TeacherNotification $notification): JsonResponse
    {
        $teacher = $this->teacher($request);
        $this->authorizeNotification($notification, $teacher);
        $notification->forceFill([
            'read_at' => $notification->read_at ?? now(),
            'dismissed_at' => now(),
        ])->save();

        return response()->json(['message' => 'Notification dismissed.']);
    }

    private function teacher(Request $request): User
    {
        /** @var User|null $teacher */
        $teacher = $request->user();
        abort_unless($teacher?->role === 'teacher', 403);

        return $teacher;
    }

    private function authorizeNotification(TeacherNotification $notification, User $teacher): void
    {
        abort_unless($notification->teacher_id === $teacher->id, 404);
    }

    private function format(TeacherNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'url' => $notification->url,
            'read' => $notification->read_at !== null,
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
