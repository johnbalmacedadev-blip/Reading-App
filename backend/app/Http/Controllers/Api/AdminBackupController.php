<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupRecord;
use App\Models\BackupSetting;
use App\Services\AuditLogger;
use App\Services\BackupScheduleService;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class AdminBackupController extends Controller
{
    public function __construct(
        private readonly BackupService $backups,
        private readonly BackupScheduleService $schedule,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $settings = BackupSetting::current();

        return response()->json([
            'backups' => BackupRecord::query()
                ->with('creator:id,name,first_name,last_name')
                ->orderByDesc('created_at')
                ->limit(100)
                ->get()
                ->map(fn (BackupRecord $record) => $this->formatRecord($record)),
            'settings' => $this->formatSettings($settings),
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'type' => ['required', 'in:database,full'],
        ]);

        set_time_limit(0);

        try {
            $record = $this->backups->create($data['type'], 'manual', $request->user());
            AuditLogger::log(
                'Backup',
                'Maintenance',
                ucfirst($data['type']).' backup generated',
                'info',
                $request,
                subject: $record,
            );

            return response()->json([
                'backup' => $this->formatRecord($record),
                'message' => 'Backup generated successfully.',
            ], 201);
        } catch (Throwable $exception) {
            report($exception);
            AuditLogger::log(
                'Backup',
                'Maintenance',
                ucfirst($data['type']).' backup failed',
                'critical',
                $request,
                metadata: ['error' => $exception->getMessage()],
            );

            return response()->json([
                'message' => 'Backup generation failed: '.$exception->getMessage(),
            ], 500);
        }
    }

    public function download(Request $request, BackupRecord $backup): BinaryFileResponse
    {
        $this->authorizeAdmin($request);
        abort_unless($backup->status === 'completed', 404);

        $path = $this->backups->absolutePath($backup);
        abort_unless(is_file($path), 404, 'Backup file not found.');

        AuditLogger::export($request, 'Maintenance', "Backup downloaded — {$backup->filename}");

        return response()->download($path, $backup->filename, [
            'Content-Type' => $backup->type === 'full' ? 'application/zip' : 'application/gzip',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function destroy(Request $request, BackupRecord $backup): JsonResponse
    {
        $this->authorizeAdmin($request);
        $filename = $backup->filename;
        $this->backups->delete($backup);

        AuditLogger::log('Delete', 'Maintenance', "Backup deleted — {$filename}", 'warning', $request);

        return response()->json(['message' => 'Backup deleted.']);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'frequency' => ['required', 'in:daily,weekly,monthly'],
            'time' => ['required', 'date_format:H:i'],
            'day_of_week' => ['required', 'integer', 'between:0,6'],
            'day_of_month' => ['required', 'integer', 'between:1,31'],
            'backup_type' => ['required', 'in:database,full'],
            'retention_count' => ['required', 'integer', 'between:1,50'],
            'timezone' => ['required', 'timezone'],
        ]);

        $settings = BackupSetting::current();
        $settings->update($data);

        AuditLogger::log(
            'Configuration',
            'Maintenance',
            $settings->enabled ? 'Automatic backups enabled or updated' : 'Automatic backups disabled',
            'info',
            $request,
            metadata: $data,
        );

        return response()->json([
            'settings' => $this->formatSettings($settings->fresh()),
            'message' => 'Backup schedule saved.',
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }

    private function formatRecord(BackupRecord $record): array
    {
        $available = $record->status === 'completed'
            && Storage::disk($record->disk)->exists(
                trim(config('backup.directory'), '/').'/'.$record->filename
            );

        return [
            'id' => $record->id,
            'filename' => $record->filename,
            'type' => $record->type,
            'trigger' => $record->trigger,
            'size' => $record->size,
            'size_label' => $this->formatBytes($record->size),
            'status' => $record->status,
            'error' => $record->error,
            'available' => $available,
            'created_by' => $record->creator?->displayName() ?? ($record->trigger === 'scheduled' ? 'System' : '—'),
            'created_at' => $record->created_at?->toIso8601String(),
            'completed_at' => $record->completed_at?->toIso8601String(),
        ];
    }

    private function formatSettings(BackupSetting $settings): array
    {
        return [
            'enabled' => $settings->enabled,
            'frequency' => $settings->frequency,
            'time' => substr($settings->time, 0, 5),
            'day_of_week' => $settings->day_of_week,
            'day_of_month' => $settings->day_of_month,
            'backup_type' => $settings->backup_type,
            'retention_count' => $settings->retention_count,
            'timezone' => $settings->timezone,
            'last_run_at' => $settings->last_run_at?->toIso8601String(),
            'next_run_at' => $this->schedule->nextRun($settings)?->toIso8601String(),
        ];
    }

    private function formatBytes(?int $bytes): string
    {
        if ($bytes === null) {
            return '—';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $value = max(0, $bytes);
        $index = 0;
        while ($value >= 1024 && $index < count($units) - 1) {
            $value /= 1024;
            $index++;
        }

        return number_format($value, $index === 0 ? 0 : 1).' '.$units[$index];
    }
}
