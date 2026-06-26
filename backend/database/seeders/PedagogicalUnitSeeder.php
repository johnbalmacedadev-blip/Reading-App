<?php

namespace Database\Seeders;

use App\Models\PedagogicalLesson;
use App\Models\PedagogicalUnit;
use Illuminate\Database\Seeder;

class PedagogicalUnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            [
                'title' => 'Unité 1',
                'description' => 'Conscience phonologique et syllabes',
                'color' => '#3b82f6',
                'text_color' => '#ffffff',
                'atelier_numbers' => [1, 2, 3, 4, 5, 6],
                'lesson_count' => 13,
            ],
            [
                'title' => 'Unité 2',
                'description' => 'Syllabes simples et correspondance',
                'color' => '#38bdf8',
                'text_color' => '#000000',
                'atelier_numbers' => [7],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 3',
                'description' => 'Syllabes ouvertes et complexes',
                'color' => '#22d3ee',
                'text_color' => '#000000',
                'atelier_numbers' => [8],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 4',
                'description' => 'Lecture de mots usuels',
                'color' => '#a3e635',
                'text_color' => '#000000',
                'atelier_numbers' => [9],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 5',
                'description' => 'Graphèmes complexes',
                'color' => '#fbbf24',
                'text_color' => '#000000',
                'atelier_numbers' => [10],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 6',
                'description' => 'Familles de mots',
                'color' => '#fb923c',
                'text_color' => '#000000',
                'atelier_numbers' => [11],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 7',
                'description' => 'Lecture répétée de phrases',
                'color' => '#fb7185',
                'text_color' => '#000000',
                'atelier_numbers' => [12],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 8',
                'description' => 'Graphèmes avancés',
                'color' => '#a855f7',
                'text_color' => '#ffffff',
                'atelier_numbers' => [13],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 9',
                'description' => 'Compréhension de texte court',
                'color' => '#0ea5e9',
                'text_color' => '#ffffff',
                'atelier_numbers' => [14],
                'lesson_count' => 8,
            ],
            [
                'title' => 'Unité 10',
                'description' => 'Lecture autonome',
                'color' => '#ef4444',
                'text_color' => '#ffffff',
                'atelier_numbers' => [15],
                'lesson_count' => 8,
            ],
        ];

        foreach ($units as $index => $data) {
            $lessonCount = $data['lesson_count'];
            unset($data['lesson_count']);

            $unit = PedagogicalUnit::updateOrCreate(
                ['sort_order' => $index + 1],
                array_merge($data, ['sort_order' => $index + 1])
            );

            for ($n = 1; $n <= $lessonCount; $n++) {
                PedagogicalLesson::updateOrCreate(
                    [
                        'pedagogical_unit_id' => $unit->id,
                        'lesson_number' => $n,
                    ],
                    []
                );
            }
        }
    }
}
