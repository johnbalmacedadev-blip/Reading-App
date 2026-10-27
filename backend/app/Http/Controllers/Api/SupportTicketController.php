<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SupportTicketController extends Controller
{
    /** @var list<string> */
    private const ALLOWED_ROLES = ['teacher', 'school_admin', 'board_admin'];

    public function info(Request $request): JsonResponse
    {
        $user = $this->authorizePortalUser($request);

        return response()->json([
            'support_email' => PlatformSetting::getValue('support_email', 'support@lecturesci.ca'),
            'platform_name' => PlatformSetting::getValue('platform_name', 'Lecture Scientifique'),
            'categories' => collect(SupportTicket::CATEGORIES)->map(fn (string $key) => [
                'value' => $key,
                'label' => (new SupportTicket(['category' => $key]))->categoryLabel(),
            ])->values(),
            'user' => [
                'id' => $user->id,
                'name' => $user->displayName(),
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->authorizePortalUser($request);

        $tickets = SupportTicket::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (SupportTicket $ticket) => $this->format($ticket));

        return response()->json(['tickets' => $tickets]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->authorizePortalUser($request);

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            'category' => ['nullable', 'in:'.implode(',', SupportTicket::CATEGORIES)],
            'priority' => ['nullable', 'in:'.implode(',', SupportTicket::PRIORITIES)],
        ]);

        $ticket = SupportTicket::query()->create([
            'user_id' => $user->id,
            'subject' => trim($data['subject']),
            'message' => trim($data['message']),
            'category' => $data['category'] ?? 'general',
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'open',
        ]);

        $emailStatus = NotificationMailer::sendSupportTicket($ticket->load('user'));

        try {
            AuditLogger::log(
                'Create',
                'Support',
                "Support ticket #{$ticket->id}: {$ticket->subject}",
                'info',
                $request,
                subject: $user,
                metadata: [
                    'ticket_id' => $ticket->id,
                    'category' => $ticket->category,
                    'email_status' => $emailStatus,
                ],
            );
        } catch (Throwable $e) {
            Log::warning('Support ticket audit log failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'ticket' => $this->format($ticket),
            'email_status' => $emailStatus,
            'message' => 'Your support request was submitted successfully.',
        ], 201);
    }

    private function format(SupportTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'message' => $ticket->message,
            'category' => $ticket->category,
            'category_label' => $ticket->categoryLabel(),
            'status' => $ticket->status,
            'status_label' => $ticket->statusLabel(),
            'priority' => $ticket->priority,
            'created_at' => $ticket->created_at?->toIso8601String(),
            'resolved_at' => $ticket->resolved_at?->toIso8601String(),
        ];
    }

    private function authorizePortalUser(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user && in_array($user->role, self::ALLOWED_ROLES, true), 403);

        return $user;
    }
}
