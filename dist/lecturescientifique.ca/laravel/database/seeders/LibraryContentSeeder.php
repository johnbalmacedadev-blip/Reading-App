<?php

namespace Database\Seeders;

use App\Models\LibraryContent;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class LibraryContentSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['title' => 'Atelier 1 — Teacher Guide', 'type' => 'Atelier', 'unit' => 'Unit 1', 'atelier' => 1, 'format' => 'PDF', 'size' => 2516582, 'uploader' => 'Admin M. Côté', 'date' => '2025-08-15'],
            ['title' => 'Atelier 2 — Student Sheet A', 'type' => 'Sheet', 'unit' => 'Unit 1', 'atelier' => 2, 'format' => 'PDF', 'size' => 1153434, 'uploader' => 'Admin M. Côté', 'date' => '2025-08-15'],
            ['title' => 'Atelier 3 — Activity Sheet', 'type' => 'Sheet', 'unit' => 'Unit 1', 'atelier' => 3, 'format' => 'PDF', 'size' => 838860, 'uploader' => 'Admin P. Gagnon', 'date' => '2025-08-16'],
            ['title' => 'Unit 2 — Main Lesson', 'type' => 'Lesson', 'unit' => 'Unit 2', 'atelier' => 7, 'format' => 'PDF', 'size' => 3355443, 'uploader' => 'Admin M. Côté', 'date' => '2025-09-01'],
            ['title' => 'Unit 3 — MCQ Assessment', 'type' => 'Assessment', 'unit' => 'Unit 3', 'atelier' => 8, 'format' => 'PDF', 'size' => 524288, 'uploader' => 'Admin L. Bergeron', 'date' => '2025-09-10'],
            ['title' => 'Complete SML Pedagogical Guide', 'type' => 'PDF', 'unit' => 'General', 'atelier' => 0, 'format' => 'PDF', 'size' => 9126805, 'uploader' => 'Admin M. Côté', 'date' => '2025-07-01'],
            ['title' => 'Atelier 4 — Phonological Materials', 'type' => 'Resource', 'unit' => 'Unit 1', 'atelier' => 4, 'format' => 'ZIP', 'size' => 1992294, 'uploader' => 'Admin P. Gagnon', 'date' => '2025-08-20'],
            ['title' => 'Unit 5 — Progress Tracking Sheet', 'type' => 'Sheet', 'unit' => 'Unit 5', 'atelier' => 10, 'format' => 'PDF', 'size' => 629145, 'uploader' => 'Admin L. Bergeron', 'date' => '2025-09-15'],
            ['title' => 'Atelier 6 — End of Kindergarten Assessment', 'type' => 'Assessment', 'unit' => 'Unit 1', 'atelier' => 6, 'format' => 'PDF', 'size' => 1363149, 'uploader' => 'Admin M. Côté', 'date' => '2025-09-20'],
            ['title' => 'Visual Resources — Alphabet', 'type' => 'Resource', 'unit' => 'General', 'atelier' => 0, 'format' => 'ZIP', 'size' => 4718592, 'uploader' => 'Admin P. Gagnon', 'date' => '2025-10-01'],
            ['title' => 'Atelier 5 — Syllable Cards', 'type' => 'Resource', 'unit' => 'Unit 1', 'atelier' => 5, 'format' => 'ZIP', 'size' => 1782579, 'uploader' => 'Admin M. Côté', 'date' => '2025-08-22'],
            ['title' => 'Unit 4 — Fluency Practice', 'type' => 'Lesson', 'unit' => 'Unit 4', 'atelier' => 9, 'format' => 'PDF', 'size' => 2621440, 'uploader' => 'Admin L. Bergeron', 'date' => '2025-09-05'],
            ['title' => 'Unit 6 — Word Family Assessment', 'type' => 'Assessment', 'unit' => 'Unit 6', 'atelier' => 11, 'format' => 'PDF', 'size' => 786432, 'uploader' => 'Admin P. Gagnon', 'date' => '2025-09-18'],
            ['title' => 'Atelier 7 — Decoding Guide', 'type' => 'Atelier', 'unit' => 'Unit 2', 'atelier' => 7, 'format' => 'PDF', 'size' => 2097152, 'uploader' => 'Admin M. Côté', 'date' => '2025-09-02'],
            ['title' => 'SML Benchmark Reference Sheet', 'type' => 'PDF', 'unit' => 'General', 'atelier' => 0, 'format' => 'PDF', 'size' => 1048576, 'uploader' => 'Admin L. Bergeron', 'date' => '2025-07-15'],
        ];

        Storage::disk('public')->makeDirectory('library');

        $continuumSource = resource_path('continuum/continuum-sml.pdf');
        if (file_exists($continuumSource)) {
            Storage::disk('public')->put(
                'library/continuum-sml.pdf',
                file_get_contents($continuumSource)
            );
        }

        foreach ($items as $index => $item) {
            $slug = 'sample-'.($index + 1);
            $extension = strtolower($item['format']);
            $filePath = "library/{$slug}.{$extension}";
            $body = "Lecture Portal — {$item['title']}\nType: {$item['type']}\nUnit: {$item['unit']}\n";

            Storage::disk('public')->put($filePath, $body);
            $actualSize = Storage::disk('public')->size($filePath);

            LibraryContent::updateOrCreate(
                ['title' => $item['title']],
                [
                    'type' => $item['type'],
                    'unit' => $item['unit'],
                    'atelier' => $item['atelier'],
                    'format' => $item['format'],
                    'file_size_bytes' => $actualSize > 0 ? $actualSize : $item['size'],
                    'file_path' => $filePath,
                    'uploader' => $item['uploader'],
                    'created_at' => $item['date'].' 12:00:00',
                    'updated_at' => $item['date'].' 12:00:00',
                ]
            );
        }
    }
}
