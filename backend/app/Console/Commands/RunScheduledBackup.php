<?php

namespace App\Console\Commands;

use App\Models\BackupSetting;
use App\Services\AuditLogger;
use App\Services\BackupScheduleService;
use App\Services\BackupService;
use Illuminate\Console\Command;
use Throwable;

class RunScheduledBackup extends Command
{
    protected $signature = 'backups:run {--force : Run even when the schedule is not due}';

    protected $description = 'Run the configured automatic application backup';

    public function handle(BackupService $backups, BackupScheduleService $schedule): int
    {
        $settings = BackupSetting::current();

        if (! $this->option('force') && ! $schedule->isDue($settings)) {
            $this->components->info('No automatic backup is due.');

            return self::SUCCESS;
        }

        if (! $settings->enabled && ! $this->option('force')) {
            $this->components->info('Automatic backups are disabled.');

            return self::SUCCESS;
        }

        try {
            $record = $backups->create($settings->backup_type, 'scheduled');
            $settings->update(['last_run_at' => now()]);
            $backups->pruneScheduled($settings->retention_count);

            AuditLogger::log(
                'Backup',
                'Maintenance',
                ucfirst($settings->backup_type).' automatic backup generated',
                'info',
                subject: $record,
                userName: 'System',
            );
            $this->components->info("Created {$record->filename}");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            report($exception);
            AuditLogger::log(
                'Backup',
                'Maintenance',
                'Automatic backup failed',
                'critical',
                metadata: ['error' => $exception->getMessage()],
                userName: 'System',
            );
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
