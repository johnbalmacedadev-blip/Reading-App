<?php

namespace App\Services;

use App\Models\BackupRecord;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class BackupService
{
    public function create(string $type, string $trigger = 'manual', ?User $user = null): BackupRecord
    {
        if (! in_array($type, ['database', 'full'], true)) {
            throw new RuntimeException('Unsupported backup type.');
        }

        $extension = $type === 'database' ? 'sql.gz' : 'zip';
        $filename = sprintf(
            '%s-%s-%s.%s',
            $type,
            now()->format('Y-m-d-His'),
            substr(bin2hex(random_bytes(4)), 0, 8),
            $extension,
        );

        $record = BackupRecord::query()->create([
            'filename' => $filename,
            'type' => $type,
            'trigger' => $trigger,
            'disk' => config('backup.disk'),
            'status' => 'running',
            'created_by' => $user?->id,
        ]);

        try {
            $disk = Storage::disk($record->disk);
            $relativePath = $this->relativePath($filename);
            $disk->makeDirectory(config('backup.directory'));
            $absolutePath = $disk->path($relativePath);

            if ($type === 'database') {
                $temporarySql = tempnam(sys_get_temp_dir(), 'lecture-db-');
                if ($temporarySql === false) {
                    throw new RuntimeException('Unable to create a temporary database file.');
                }

                try {
                    $this->dumpDatabase($temporarySql);
                    $this->gzipFile($temporarySql, $absolutePath);
                } finally {
                    @unlink($temporarySql);
                }
            } else {
                $this->createFullArchive($absolutePath);
            }

            clearstatcache(true, $absolutePath);
            $record->update([
                'size' => filesize($absolutePath) ?: 0,
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            return $record->fresh();
        } catch (Throwable $exception) {
            if (isset($relativePath)) {
                Storage::disk($record->disk)->delete($relativePath);
            }

            $record->update([
                'status' => 'failed',
                'error' => mb_substr($exception->getMessage(), 0, 4000),
            ]);

            throw $exception;
        }
    }

    public function delete(BackupRecord $record): void
    {
        Storage::disk($record->disk)->delete($this->relativePath($record->filename));
        $record->delete();
    }

    public function pruneScheduled(int $keep): void
    {
        BackupRecord::query()
            ->where('trigger', 'scheduled')
            ->where('status', 'completed')
            ->orderByDesc('completed_at')
            ->skip(max(1, $keep))
            ->take(PHP_INT_MAX)
            ->get()
            ->each(fn (BackupRecord $record) => $this->delete($record));
    }

    public function absolutePath(BackupRecord $record): string
    {
        return Storage::disk($record->disk)->path($this->relativePath($record->filename));
    }

    private function relativePath(string $filename): string
    {
        return trim(config('backup.directory'), '/').'/'.basename($filename);
    }

    private function dumpDatabase(string $destination): void
    {
        $connectionName = config('database.default');
        $connection = config("database.connections.{$connectionName}");
        $driver = $connection['driver'] ?? null;

        if ($driver === 'sqlite') {
            $database = $connection['database'] ?? null;
            if (! $database || ! is_file($database) || ! copy($database, $destination)) {
                throw new RuntimeException('Unable to copy the SQLite database.');
            }

            return;
        }

        if ($driver !== 'mysql' && $driver !== 'mariadb') {
            throw new RuntimeException("Database backups are not configured for the {$driver} driver.");
        }

        $binary = $this->mysqldumpBinary();
        $arguments = [
            $binary,
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            '--no-tablespaces',
            '--default-character-set=utf8mb4',
        ];

        if (! empty($connection['unix_socket'])) {
            $arguments[] = '--socket='.$connection['unix_socket'];
        } else {
            $arguments[] = '--host='.($connection['host'] ?? '127.0.0.1');
            $arguments[] = '--port='.(string) ($connection['port'] ?? 3306);
        }

        $arguments[] = '--user='.($connection['username'] ?? '');
        $arguments[] = (string) ($connection['database'] ?? '');

        $handle = fopen($destination, 'wb');
        if ($handle === false) {
            throw new RuntimeException('Unable to write the database backup.');
        }

        $process = new Process($arguments, base_path(), [
            'MYSQL_PWD' => (string) ($connection['password'] ?? ''),
        ]);
        $process->setTimeout(900);

        try {
            $process->run(function (string $type, string $buffer) use ($handle): void {
                if ($type === Process::OUT) {
                    fwrite($handle, $buffer);
                }
            });
        } finally {
            fclose($handle);
        }

        if (! $process->isSuccessful()) {
            throw new RuntimeException(
                'Database export failed: '.trim($process->getErrorOutput() ?: 'mysqldump returned an error.')
            );
        }
    }

    private function mysqldumpBinary(): string
    {
        $configured = (string) config('backup.mysqldump_path', 'mysqldump');

        if (
            PHP_OS_FAMILY === 'Windows'
            && $configured === 'mysqldump'
            && is_file('C:\\xampp\\mysql\\bin\\mysqldump.exe')
        ) {
            return 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        }

        return $configured;
    }

    private function gzipFile(string $source, string $destination): void
    {
        $input = fopen($source, 'rb');
        $output = gzopen($destination, 'wb9');

        if ($input === false || $output === false) {
            if (is_resource($input)) {
                fclose($input);
            }
            throw new RuntimeException('Unable to compress the database backup.');
        }

        while (! feof($input)) {
            $chunk = fread($input, 1024 * 1024);
            if ($chunk === false || gzwrite($output, $chunk) === false) {
                fclose($input);
                gzclose($output);
                throw new RuntimeException('Database backup compression failed.');
            }
        }

        fclose($input);
        gzclose($output);
    }

    private function createFullArchive(string $destination): void
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('The PHP ZIP extension is required for full backups.');
        }

        $zip = new ZipArchive();
        if ($zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create the ZIP backup.');
        }

        $temporarySql = tempnam(sys_get_temp_dir(), 'lecture-full-db-');
        if ($temporarySql === false) {
            $zip->close();
            throw new RuntimeException('Unable to create a temporary database file.');
        }

        try {
            $this->dumpDatabase($temporarySql);
            $zip->addFile($temporarySql, 'database/database.sql');
            $this->addDirectoryToZip($zip, base_path(), 'application');

            if (! $zip->close()) {
                throw new RuntimeException('Unable to finalize the ZIP backup.');
            }
        } catch (Throwable $exception) {
            $zip->close();
            @unlink($destination);
            throw $exception;
        } finally {
            @unlink($temporarySql);
        }
    }

    private function addDirectoryToZip(ZipArchive $zip, string $root, string $archiveRoot): void
    {
        $root = rtrim(realpath($root) ?: $root, DIRECTORY_SEPARATOR);
        $backupDirectory = realpath(
            Storage::disk(config('backup.disk'))->path(config('backup.directory'))
        );

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY,
        );

        foreach ($iterator as $file) {
            if ($file->isLink() || ! $file->isFile() || ! $file->isReadable()) {
                continue;
            }

            $absolute = $file->getRealPath();
            if ($absolute === false || $this->isExcluded($absolute, $root, $backupDirectory ?: null)) {
                continue;
            }

            $relative = ltrim(str_replace('\\', '/', substr($absolute, strlen($root))), '/');
            $zip->addFile($absolute, $archiveRoot.'/'.$relative);
        }
    }

    private function isExcluded(string $path, string $root, ?string $backupDirectory): bool
    {
        $normalized = str_replace('\\', '/', $path);
        $relative = ltrim(str_replace('\\', '/', substr($path, strlen($root))), '/');

        if ($backupDirectory && str_starts_with($normalized, str_replace('\\', '/', $backupDirectory).'/')) {
            return true;
        }

        foreach (['.git/', 'node_modules/', 'storage/framework/', 'storage/logs/'] as $excluded) {
            if (str_starts_with($relative, $excluded)) {
                return true;
            }
        }

        return false;
    }
}
