<?php

namespace Database\Seeders;

use App\Models\DownloadableCategory;
use App\Models\DownloadableResource;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DownloadableResourceSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'title' => 'Conscience phonologique',
                'color' => '#3b82f6',
                'sort_order' => 1,
                'resources' => [
                    'Rimes', 'Segmentation', 'Fusions', 'Sons initiaux', 'Sons finaux',
                    'Syllabes', 'Manipulation de phonèmes', 'Identification de sons', 'Comptage de syllabes',
                ],
            ],
            [
                'title' => 'Connaissance alphabétique',
                'color' => '#38bdf8',
                'sort_order' => 2,
                'resources' => [
                    'Voyelles', 'Consonnes', 'Lecture de CV', 'Lecture VC', 'Lecture CVC', 'Fusion phonémique',
                ],
            ],
            [
                'title' => 'Décodage',
                'color' => '#fbbf24',
                'sort_order' => 3,
                'resources' => [
                    'Syllabes ouvertes', 'Syllabes fermées', 'Mots fréquents', 'Les sons complexes',
                    'Familles de mots', 'Sons muets',
                ],
            ],
            [
                'title' => 'Fluidité',
                'color' => '#a855f7',
                'sort_order' => 4,
                'resources' => [
                    'Phrases simples', 'Phrases pyramides', 'Lecture de textes', 'Pratique de fluidité',
                    'Lecture répétée', 'Lecture chronométrée',
                ],
            ],
            [
                'title' => 'Compréhension',
                'color' => '#0ea5e9',
                'sort_order' => 5,
                'resources' => [
                    'Compréhension de texte', 'Inférence', 'Résumé', 'Idées principales',
                    'Questions littérales', 'Prédictions',
                ],
            ],
        ];

        foreach ($categories as $categoryData) {
            $category = DownloadableCategory::updateOrCreate(
                ['slug' => Str::slug($categoryData['title'])],
                [
                    'title' => $categoryData['title'],
                    'color' => $categoryData['color'],
                    'sort_order' => $categoryData['sort_order'],
                ]
            );

            foreach ($categoryData['resources'] as $index => $title) {
                DownloadableResource::updateOrCreate(
                    [
                        'downloadable_category_id' => $category->id,
                        'title' => $title,
                    ],
                    ['sort_order' => $index + 1]
                );
            }
        }
    }
}
