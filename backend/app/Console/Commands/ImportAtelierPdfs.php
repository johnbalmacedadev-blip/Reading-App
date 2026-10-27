<?php

namespace App\Console\Commands;

use App\Models\Assessment;
use App\Models\AssessmentAtelierFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

class ImportAtelierPdfs extends Command
{
    protected $signature = 'assessments:import-atelier-pdfs
        {path : Absolute path to the PDF attachments for ateliers folder}
        {--dry-run : List matches without writing files}';

    protected $description = 'Import PDF support files for workshops/ateliers from named Atelier folders (PDF only)';

    /** @var list<int> */
    private const TARGET_ATELIERS = [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 15];

    public function handle(): int
    {
        $root = rtrim((string) $this->argument('path'), DIRECTORY_SEPARATOR);
        if (! is_dir($root)) {
            $this->error("Folder not found: {$root}");

            return self::FAILURE;
        }

        $dry = (bool) $this->option('dry-run');
        if ($dry) {
            $this->warn('Dry run — no files will be written.');
        }

        $updated = 0;
        $skipped = 0;
        $missing = 0;

        foreach (self::TARGET_ATELIERS as $atelier) {
            $pdfPath = $this->findPdfForAtelier($root, $atelier);
            if ($pdfPath === null) {
                $this->warn("No PDF found for Atelier {$atelier}");
                $missing++;
                continue;
            }

            $assessments = Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->orderBy('id')
                ->get();

            if ($assessments->isEmpty()) {
                $this->warn("No platform assessment for Atelier {$atelier}");
                $missing++;
                continue;
            }

            foreach ($assessments as $assessment) {
                $this->line("Atelier {$atelier} → assessment #{$assessment->id} ({$assessment->title}) ← ".basename($pdfPath));

                if ($dry) {
                    $updated++;
                    continue;
                }

                $this->replacePdf($assessment, $pdfPath);
                $updated++;
            }
        }

        // Report non-target folders with PDFs (should not import)
        foreach ($this->listAtelierDirs($root) as $dir) {
            if (! preg_match('/atelier\s*(\d+)/i', basename($dir), $m)) {
                continue;
            }
            $n = (int) $m[1];
            if (! in_array($n, self::TARGET_ATELIERS, true)) {
                $this->comment("Skipped Atelier {$n} (not in target list)");
                $skipped++;
            }
        }

        $this->newLine();
        $this->info("PDFs attached: {$updated}");
        $this->info("Missing: {$missing}");
        $this->info("Skipped ateliers: {$skipped}");

        return self::SUCCESS;
    }

    private function replacePdf(Assessment $assessment, string $pdfPath): void
    {
        foreach ($assessment->atelierFiles()->where('file_type', 'pdf')->get() as $existing) {
            if ($existing->file_path && Storage::disk('public')->exists($existing->file_path)) {
                Storage::disk('public')->delete($existing->file_path);
            }
            $existing->delete();
        }

        // Drop non-PDF support files for these ateliers (PowerPoint/Word excluded by request)
        foreach ($assessment->atelierFiles()->where('file_type', '!=', 'pdf')->get() as $other) {
            if ($other->file_path && Storage::disk('public')->exists($other->file_path)) {
                Storage::disk('public')->delete($other->file_path);
            }
            $other->delete();
        }

        $storedName = Str::uuid()->toString().'.pdf';
        $relative = 'atelier-files/'.$storedName;
        Storage::disk('public')->put($relative, file_get_contents($pdfPath));

        AssessmentAtelierFile::query()->create([
            'assessment_id' => $assessment->id,
            'file_path' => $relative,
            'original_name' => basename($pdfPath),
            'file_type' => 'pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => filesize($pdfPath) ?: 0,
            'sort_order' => 1,
        ]);
    }

    private function findPdfForAtelier(string $root, int $atelier): ?string
    {
        foreach ($this->listAtelierDirs($root) as $dir) {
            if (! preg_match('/atelier\s*(\d+)/i', basename($dir), $m)) {
                continue;
            }
            if ((int) $m[1] !== $atelier) {
                continue;
            }

            $pdfs = [];
            foreach (scandir($dir) ?: [] as $name) {
                if ($name === '.' || $name === '..') {
                    continue;
                }
                $full = $dir.DIRECTORY_SEPARATOR.$name;
                if (is_file($full) && strtolower(pathinfo($full, PATHINFO_EXTENSION)) === 'pdf') {
                    $pdfs[] = $full;
                }
            }

            if ($pdfs === []) {
                return null;
            }

            usort($pdfs, fn ($a, $b) => strlen(basename($a)) <=> strlen(basename($b)));

            return $pdfs[0];
        }

        // Fallback: scan recursively for "Atelier N ... .pdf"
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            /** @var SplFileInfo $file */
            if (! $file->isFile()) {
                continue;
            }
            if (strtolower($file->getExtension()) !== 'pdf') {
                continue;
            }
            if (preg_match('/atelier\s*'.$atelier.'\b/i', $file->getFilename())) {
                return $file->getPathname();
            }
        }

        return null;
    }

    /** @return list<string> */
    private function listAtelierDirs(string $root): array
    {
        $dirs = [];
        foreach (scandir($root) ?: [] as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $full = $root.DIRECTORY_SEPARATOR.$name;
            if (is_dir($full) && preg_match('/atelier\s*\d+/i', $name)) {
                $dirs[] = $full;
            }
        }

        // Nested "PDF attachments for ateliers" wrapper
        if ($dirs === []) {
            foreach (scandir($root) ?: [] as $name) {
                if ($name === '.' || $name === '..') {
                    continue;
                }
                $full = $root.DIRECTORY_SEPARATOR.$name;
                if (is_dir($full)) {
                    foreach ($this->listAtelierDirs($full) as $child) {
                        $dirs[] = $child;
                    }
                }
            }
        }

        return $dirs;
    }
}
