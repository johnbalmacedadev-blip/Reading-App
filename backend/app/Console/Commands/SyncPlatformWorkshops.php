<?php

namespace App\Console\Commands;

use App\Models\Assessment;
use Illuminate\Console\Command;

class SyncPlatformWorkshops extends Command
{
    protected $signature = 'assessments:sync-platform-workshops
        {--replace : Archive existing active platform assessments before creating the 15 template workshops}';

    protected $description = 'Create/update the 15 platform workshop assessments (format_1..format_15, grade=All)';

    public function handle(): int
    {
        $path = database_path('data/platform-workshop-assessments.json');
        if (! is_file($path)) {
            $this->error("Missing payloads file: {$path}");

            return self::FAILURE;
        }

        $payloads = json_decode((string) file_get_contents($path), true);
        if (! is_array($payloads) || $payloads === []) {
            $this->error('Payloads file is empty or invalid JSON.');

            return self::FAILURE;
        }

        if ($this->option('replace')) {
            $archived = Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->update(['archived_at' => now()]);

            $this->info("Archived {$archived} existing platform assessment(s).");
        }

        $created = 0;
        $updated = 0;

        foreach ($payloads as $payload) {
            $atelier = (int) ($payload['atelier'] ?? 0);
            $templateId = (string) ($payload['template_id'] ?? '');
            if ($atelier < 1 || $atelier > 15 || $templateId === '') {
                $this->warn('Skipping invalid payload entry.');
                continue;
            }

            $assessment = Assessment::query()
                ->whereNull('school_board')
                ->whereNull('school_id')
                ->whereNull('teacher_id')
                ->whereNull('archived_at')
                ->where('atelier', $atelier)
                ->where('template_id', $templateId)
                ->first();

            $attributes = [
                'title' => $payload['title'] ?? "Workshop {$atelier} Assessment",
                'unit' => $payload['unit'] ?? null,
                'atelier' => $atelier,
                'grade' => $payload['grade'] ?? 'All',
                'status' => strtolower((string) ($payload['status'] ?? 'published')),
                'template_id' => $templateId,
                'template_draft' => $payload['template_draft'] ?? null,
                'archived_at' => null,
            ];

            if ($assessment) {
                $assessment->update($attributes);
                $updated++;
                $this->line("Updated #{$assessment->id} atelier={$atelier} {$templateId}");
            } else {
                $assessment = Assessment::create($attributes);
                $created++;
                $this->line("Created #{$assessment->id} atelier={$atelier} {$templateId}");
            }
        }

        $this->info("Done. created={$created} updated={$updated}");

        return self::SUCCESS;
    }
}
