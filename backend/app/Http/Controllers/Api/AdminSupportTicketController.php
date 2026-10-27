<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminSupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $query = SupportTicket::query()
            ->with('user:id,name,first_name,last_name,email,role')
            ->latest();

        if (is_string($status) && $status !== '' && $status !== 'all' && in_array($status, SupportTicket::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('email', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $tickets = $query->limit(100)->get()->map(fn (SupportTicket $ticket) => $this->format($ticket));

        $summary = [
            'total' => SupportTicket::query()->count(),
            'open' => SupportTicket::query()->where('status', 'open')->count(),
            'in_progress' => SupportTicket::query()->where('status', 'in_progress')->count(),
            'resolved' => SupportTicket::query()->whereIn('status', ['resolved', 'closed'])->count(),
        ];

        return response()->json([
            'tickets' => $tickets,
            'summary' => $summary,
            'statuses' => collect(SupportTicket::STATUSES)->map(fn (string $key) => [
                'value' => $key,
                'label' => (new SupportTicket(['status' => $key]))->statusLabel(),
            ])->values(),
        ]);
    }

    public function update(Request $request, SupportTicket $supportTicket): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'status' => ['sometimes', 'in:'.implode(',', SupportTicket::STATUSES)],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'priority' => ['sometimes', 'in:'.implode(',', SupportTicket::PRIORITIES)],
        ]);

        if (array_key_exists('status', $data)) {
            $supportTicket->status = $data['status'];
            if (in_array($data['status'], ['resolved', 'closed'], true) && ! $supportTicket->resolved_at) {
                $supportTicket->resolved_at = now();
            }
            if (in_array($data['status'], ['open', 'in_progress'], true)) {
                $supportTicket->resolved_at = null;
            }
        }

        if (array_key_exists('admin_notes', $data)) {
            $supportTicket->admin_notes = $data['admin_notes'];
        }

        if (array_key_exists('priority', $data)) {
            $supportTicket->priority = $data['priority'];
        }

        $supportTicket->save();
        $supportTicket->load('user:id,name,first_name,last_name,email,role');

        try {
            AuditLogger::log(
                'Edit',
                'Support',
                "Support ticket #{$supportTicket->id} updated ({$supportTicket->status})",
                'info',
                $request,
                subject: $request->user(),
                metadata: [
                    'ticket_id' => $supportTicket->id,
                    'status' => $supportTicket->status,
                ],
            );
        } catch (Throwable $e) {
            Log::warning('Support ticket audit log failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'ticket' => $this->format($supportTicket),
            'message' => 'Ticket updated.',
        ]);
    }

    private function format(SupportTicket $ticket): array
    {
        $user = $ticket->user;

        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'message' => $ticket->message,
            'category' => $ticket->category,
            'category_label' => $ticket->categoryLabel(),
            'status' => $ticket->status,
            'status_label' => $ticket->statusLabel(),
            'priority' => $ticket->priority,
            'admin_notes' => $ticket->admin_notes,
            'created_at' => $ticket->created_at?->toIso8601String(),
            'resolved_at' => $ticket->resolved_at?->toIso8601String(),
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->displayName(),
                'email' => $user->email,
                'role' => $user->role,
            ] : null,
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
