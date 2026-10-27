<?php

namespace App\Console\Commands;

use App\Models\DownloadableCategory;
use App\Models\DownloadableResource;
use App\Models\PedagogicalLesson;
use App\Models\PedagogicalUnit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

class ImportContentLibrary extends Command
{
    protected $signature = 'content:import
        {path : Absolute path to the Content (Library) folder}
        {--dry-run : List matches without writing files}';

    protected $description = 'Import Downloadable Resources and Pedagogical Unit PDFs from the Content (Library) folder';

    /** @var array<string, string> */
    private array $resourceTitleAliases = [
        'segmentations' => 'Segmentation',
        'identification de sons' => 'Identification de sons',
        'lecture cvcv' => 'Fusion phonémique',
        'lecture en tandem' => 'Lecture chronométrée',
    ];

    private int $downloadableUpdated = 0;

    private int $downloadableSkipped = 0;

    private int $unitsUpdated = 0;

    private int $lessonsUpdated = 0;

    private int $unmatched = 0;

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

        $this->importDownloadables($root, $dry);
        $this->importUnits($root, $dry);

        $this->newLine();
        $this->info("Downloadable resources updated: {$this->downloadableUpdated}");
        $this->info("Downloadable unmatched/skipped: {$this->downloadableSkipped}");
        $this->info("Unit quick sheets updated: {$this->unitsUpdated}");
        $this->info("Lesson files updated: {$this->lessonsUpdated}");
        $this->info("Unmatched files: {$this->unmatched}");

        return self::SUCCESS;
    }

    private function importDownloadables(string $root, bool $dry): void
    {
        $dir = $this->findChildDir($root, 'Downloadable Resources');
        if ($dir === null) {
            $this->warn('Downloadable Resources folder not found.');

            return;
        }

        $this->info('Importing downloadable resources...');

        foreach ($this->listDirs($dir) as $categoryDir) {
            $categoryName = $categoryDir->getFilename();
            $category = $this->findCategory($categoryName);
            if (! $category) {
                $this->error("  No category match for folder: {$categoryName}");
                $this->unmatched++;

                continue;
            }

            $this->line("  Category: {$category->title}");

            foreach ($this->listFiles($categoryDir->getPathname(), ['pdf']) as $file) {
                $stem = $this->resourceStem($file->getFilename());
                $resource = $this->findResource($category, $stem);
                if (! $resource) {
                    $this->warn("    Unmatched: {$file->getFilename()} (stem: {$stem})");
                    $this->downloadableSkipped++;
                    $this->unmatched++;

                    continue;
                }

                $this->line("    → {$resource->title}");
                if ($dry) {
                    $this->downloadableUpdated++;

                    continue;
                }

                $this->storeDownloadableFile($resource, $file->getPathname());
                $this->downloadableUpdated++;
            }
        }
    }

    private function importUnits(string $root, bool $dry): void
    {
        $this->info('Importing pedagogical units...');

        for ($unitNumber = 1; $unitNumber <= 10; $unitNumber++) {
            $unitDir = $this->findChildDir($root, "Unit {$unitNumber}");
            if ($unitDir === null) {
                $this->warn("  Unit {$unitNumber} folder missing.");

                continue;
            }

            $unit = PedagogicalUnit::query()
                ->where('sort_order', $unitNumber)
                ->orWhere('title', "Unité {$unitNumber}")
                ->orWhere('title', "Unite {$unitNumber}")
                ->first();

            if (! $unit) {
                $this->error("  No DB unit for Unit {$unitNumber}");
                $this->unmatched++;

                continue;
            }

            $this->line("  {$unit->title}");

            $quickSheet = $this->findQuickSheet($unitDir);
            if ($quickSheet) {
                $this->line('    → quick sheet: '.$quickSheet->getFilename());
                if (! $dry) {
                    $this->storeQuickSheet($unit, $quickSheet->getPathname());
                }
                $this->unitsUpdated++;
            } else {
                $this->warn('    Quick sheet not found');
                $this->unmatched++;
            }

            $lessonDirs = $this->listLessonDirs($unitDir, $unitNumber);
            foreach ($lessonDirs as $lessonNumber => $lessonDir) {
                $lesson = PedagogicalLesson::query()->firstOrCreate(
                    [
                        'pedagogical_unit_id' => $unit->id,
                        'lesson_number' => $lessonNumber,
                    ]
                );

                $interactive = $this->findLessonInteractive($lessonDir, $unitNumber, $lessonNumber);
                $activity = $this->findLessonActivity($lessonDir, $lessonNumber);

                if (! $interactive && ! $activity) {
                    $this->warn("    Lesson {$lessonNumber}: no files");
                    $this->unmatched++;

                    continue;
                }

                if ($interactive) {
                    $this->line("    → lesson {$lessonNumber} interactive: ".$interactive->getFilename());
                    if (! $dry) {
                        $this->storeLessonFile($lesson, $interactive->getPathname(), 'interactive');
                    }
                    $this->lessonsUpdated++;
                }

                if ($activity) {
                    $this->line("    → lesson {$lessonNumber} activity: ".$activity->getFilename());
                    if (! $dry) {
                        $this->storeLessonFile($lesson, $activity->getPathname(), 'activity_sheet');
                    }
                    $this->lessonsUpdated++;
                }
            }
        }
    }

    private function findCategory(string $folderName): ?DownloadableCategory
    {
        $normalizedFolder = $this->normalize($folderName);

        return DownloadableCategory::query()->get()->first(function (DownloadableCategory $category) use ($normalizedFolder, $folderName) {
            return $this->normalize($category->title) === $normalizedFolder
                || Str::slug($category->title) === Str::slug($folderName);
        });
    }

    private function findResource(DownloadableCategory $category, string $stem): ?DownloadableResource
    {
        $normalizedStem = $this->normalize($stem);
        $aliasTarget = $this->resourceTitleAliases[$normalizedStem] ?? null;

        $resources = $category->resources()->get();

        foreach ($resources as $resource) {
            $normalizedTitle = $this->normalize($resource->title);
            if ($normalizedTitle === $normalizedStem) {
                return $resource;
            }
            if ($aliasTarget && $this->normalize($aliasTarget) === $normalizedTitle) {
                return $resource;
            }
        }

        // Fuzzy: stem contains title or title contains stem
        foreach ($resources as $resource) {
            $normalizedTitle = $this->normalize($resource->title);
            if ($normalizedTitle !== '' && (str_contains($normalizedStem, $normalizedTitle) || str_contains($normalizedTitle, $normalizedStem))) {
                return $resource;
            }
        }

        return null;
    }

    private function resourceStem(string $filename): string
    {
        $name = pathinfo($filename, PATHINFO_FILENAME);
        $name = preg_replace('/\s*-\s*Lecture Scientifique\s*$/iu', '', $name) ?? $name;

        return trim($name);
    }

    private function findQuickSheet(string $unitDir): ?SplFileInfo
    {
        foreach ($this->listFiles($unitDir, ['pdf']) as $file) {
            $name = $this->normalize($file->getFilename());
            if (str_contains($name, 'vue d ensemble') || str_contains($name, 'vue densemble')) {
                return $file;
            }
        }

        return null;
    }

    /**
     * @return array<int, string> lessonNumber => path
     */
    private function listLessonDirs(string $unitDir, int $unitNumber): array
    {
        $result = [];

        foreach ($this->listDirs($unitDir) as $dir) {
            $name = $dir->getFilename();
            if (preg_match('/^Lesson\s+(\d+)$/i', $name, $m)) {
                $result[(int) $m[1]] = $dir->getPathname();

                continue;
            }
            // Unit 7 uses nested "Unit 1".."Unit 8" as lesson folders
            if ($unitNumber === 7 && preg_match('/^Unit\s+(\d+)$/i', $name, $m)) {
                $result[(int) $m[1]] = $dir->getPathname();
            }
        }

        ksort($result);

        return $result;
    }

    private function findLessonInteractive(string $lessonDir, int $unitNumber, int $lessonNumber): ?SplFileInfo
    {
        foreach ($this->listFiles($lessonDir, ['pdf']) as $file) {
            $name = $this->normalize($file->getFilename());
            if (str_contains($name, 'activite')) {
                continue;
            }
            if (str_contains($name, "unite {$unitNumber}") && str_contains($name, "lecon {$lessonNumber}")) {
                return $file;
            }
            if (str_contains($name, 'unite') && str_contains($name, 'lecon')) {
                return $file;
            }
        }

        return null;
    }

    private function findLessonActivity(string $lessonDir, int $lessonNumber): ?SplFileInfo
    {
        foreach ($this->listFiles($lessonDir, ['pdf']) as $file) {
            $name = $this->normalize($file->getFilename());
            if (str_contains($name, 'activite')) {
                return $file;
            }
        }

        return null;
    }

    private function storeDownloadableFile(DownloadableResource $resource, string $absolutePath): void
    {
        if ($resource->file_path) {
            Storage::disk('public')->delete($resource->file_path);
        }

        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION) ?: 'pdf');
        $storedName = Str::uuid().'.'.$extension;
        $relative = 'downloadable-resources/'.$storedName;
        Storage::disk('public')->put($relative, file_get_contents($absolutePath));

        $resource->forceFill([
            'file_path' => $relative,
            'file_format' => strtoupper($extension),
            'file_size_bytes' => filesize($absolutePath) ?: 0,
        ])->save();
    }

    private function storeQuickSheet(PedagogicalUnit $unit, string $absolutePath): void
    {
        if ($unit->quick_sheet_path) {
            Storage::disk('public')->delete($unit->quick_sheet_path);
        }

        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION) ?: 'pdf');
        $storedName = Str::uuid().'.'.$extension;
        $relative = 'pedagogical-units/'.$storedName;
        Storage::disk('public')->put($relative, file_get_contents($absolutePath));

        $unit->forceFill([
            'quick_sheet_path' => $relative,
            'quick_sheet_format' => strtoupper($extension),
            'quick_sheet_size_bytes' => filesize($absolutePath) ?: 0,
        ])->save();
    }

    private function storeLessonFile(PedagogicalLesson $lesson, string $absolutePath, string $kind): void
    {
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION) ?: 'pdf');
        $storedName = Str::uuid().'.'.$extension;
        $relative = 'pedagogical-lessons/'.$storedName;

        if ($kind === 'interactive') {
            if ($lesson->interactive_path) {
                Storage::disk('public')->delete($lesson->interactive_path);
            }
            Storage::disk('public')->put($relative, file_get_contents($absolutePath));
            $lesson->forceFill([
                'interactive_path' => $relative,
                'interactive_format' => strtoupper($extension),
                'interactive_size_bytes' => filesize($absolutePath) ?: 0,
            ])->save();

            return;
        }

        if ($lesson->activity_sheet_path) {
            Storage::disk('public')->delete($lesson->activity_sheet_path);
        }
        Storage::disk('public')->put($relative, file_get_contents($absolutePath));
        $lesson->forceFill([
            'activity_sheet_path' => $relative,
            'activity_sheet_format' => strtoupper($extension),
            'activity_sheet_size_bytes' => filesize($absolutePath) ?: 0,
        ])->save();
    }

    private function findChildDir(string $parent, string $name): ?string
    {
        $direct = $parent.DIRECTORY_SEPARATOR.$name;
        if (is_dir($direct)) {
            return $direct;
        }

        foreach ($this->listDirs($parent) as $dir) {
            if ($this->normalize($dir->getFilename()) === $this->normalize($name)) {
                return $dir->getPathname();
            }
        }

        return null;
    }

    /** @return list<SplFileInfo> */
    private function listDirs(string $path): array
    {
        $items = [];
        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $full = $path.DIRECTORY_SEPARATOR.$entry;
            if (is_dir($full)) {
                $items[] = new SplFileInfo($full);
            }
        }

        return $items;
    }

    /**
     * @param  list<string>  $extensions
     * @return list<SplFileInfo>
     */
    private function listFiles(string $path, array $extensions): array
    {
        $allowed = array_map('strtolower', $extensions);
        $items = [];
        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $full = $path.DIRECTORY_SEPARATOR.$entry;
            if (! is_file($full)) {
                continue;
            }
            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (in_array($ext, $allowed, true)) {
                $items[] = new SplFileInfo($full);
            }
        }

        return $items;
    }

    private function normalize(string $value): string
    {
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value, \Normalizer::FORM_C) ?: $value;
        }

        // Common mojibake / punctuation from macOS filenames
        $value = str_replace([',', '’', "'", 'ʻ', 'ʼ', '_'], ['', '', '', '', '', ''], $value);
        $value = str_replace(['–', '—', '-'], ' ', $value);

        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (is_string($transliterated) && $transliterated !== '') {
            $value = $transliterated;
        }

        $value = strtolower($value);
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        $value = preg_replace('/[^a-z0-9 ]+/', '', $value) ?? $value;

        return trim($value);
    }
}
