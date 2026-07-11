<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('target', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->string('category')->toString() !== 'All') {
            $query->where('category', $request->string('category')->toString());
        }

        if ($request->filled('severity') && $request->string('severity')->toString() !== 'All') {
            $query->where('severity', strtolower($request->string('severity')->toString()));
        }

        $this->applyDateRange($query, $request->string('date_range')->toString());

        $summaryQuery = clone $query;

        $entries = $query->limit(500)->get()->map(fn (AuditLog $log) => $this->formatEntry($log));

        $allForSummary = $summaryQuery->get(['severity']);

        return response()->json([
            'entries' => $entries,
            'summary' => [
                'total' => $allForSummary->count(),
                'critical' => $allForSummary->where('severity', 'critical')->count(),
                'warning' => $allForSummary->where('severity', 'warning')->count(),
                'info' => $allForSummary->where('severity', 'info')->count(),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        AuditLogger::export($request, 'Settings', 'Audit log exported to CSV');

        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('target', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->string('category')->toString() !== 'All') {
            $query->where('category', $request->string('category')->toString());
        }

        if ($request->filled('severity') && $request->string('severity')->toString() !== 'All') {
            $query->where('severity', strtolower($request->string('severity')->toString()));
        }

        $this->applyDateRange($query, $request->string('date_range')->toString());

        $filename = 'audit-log-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Timestamp', 'User', 'Role', 'Action', 'Category', 'Detail', 'IP Address', 'Severity']);

            $query->chunk(200, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    /** @var AuditLog $log */
                    fputcsv($handle, [
                        $log->created_at?->format('Y-m-d H:i:s') ?? '',
                        $log->user_name,
                        $log->role_label ?? '—',
                        $log->action,
                        $log->category,
                        $log->target,
                        $log->ip_address ?? '',
                        ucfirst($log->severity),
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function applyDateRange($query, string $dateRange): void
    {
        $now = Carbon::now();

        match ($dateRange) {
            'Today' => $query->where('created_at', '>=', $now->copy()->startOfDay()),
            'Last 30 days' => $query->where('created_at', '>=', $now->copy()->subDays(30)),
            'This year' => $query->where('created_at', '>=', $now->copy()->startOfYear()),
            default => $query->where('created_at', '>=', $now->copy()->subDays(7)),
        };
    }

    /** @return array<string, mixed> */
    private function formatEntry(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'timestamp' => $log->created_at?->format('Y-m-d H:i:s') ?? '',
            'user' => $log->user_name,
            'role' => $log->role_label ?? '—',
            'action' => $log->action,
            'category' => $log->category,
            'target' => $log->target,
            'ip' => $log->ip_address ?? '—',
            'severity' => $log->severity,
        ];
    }
}
