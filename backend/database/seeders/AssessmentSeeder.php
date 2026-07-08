<?php

namespace Database\Seeders;

use App\Models\Assessment;
use Illuminate\Database\Seeder;

class AssessmentSeeder extends Seeder
{
    public function run(): void
    {
        if (Assessment::query()->exists()) {
            return;
        }

        $sampleQuestions = [
            [
                'text' => "What sound does the letter 'm' make?",
                'options' => ['/m/', '/b/', '/s/', '/t/'],
                'correct' => 0,
            ],
            [
                'text' => "How many syllables in the word 'maison'?",
                'options' => ['1', '2', '3', '4'],
                'correct' => 1,
            ],
            [
                'text' => 'Which word starts with the /f/ sound?',
                'options' => ['bateau', 'forêt', 'soleil', 'maison'],
                'correct' => 1,
            ],
        ];

        $assessments = [
            [
                'title' => 'Atelier 2 Assessment — Phonological Awareness',
                'unit' => 'Unit 1',
                'atelier' => 2,
                'grade' => 'Kindergarten',
                'status' => 'published',
                'created_at' => '2025-09-01',
                'questions' => $sampleQuestions,
            ],
            [
                'title' => 'Atelier 6 Assessment — Syllabic Reading',
                'unit' => 'Unit 1',
                'atelier' => 6,
                'grade' => 'Grade 1',
                'status' => 'published',
                'created_at' => '2025-09-15',
                'questions' => array_slice($sampleQuestions, 0, 2),
            ],
            [
                'title' => 'Atelier 10 Assessment — Fluency',
                'unit' => 'Unit 4',
                'atelier' => 10,
                'grade' => 'Grade 2',
                'status' => 'draft',
                'created_at' => '2025-11-10',
                'questions' => array_slice($sampleQuestions, 0, 2),
            ],
        ];

        foreach ($assessments as $row) {
            $questions = $row['questions'];
            unset($row['questions']);

            $assessment = Assessment::create($row);

            foreach ($questions as $index => $question) {
                $assessment->questions()->create([
                    'sort_order' => $index,
                    'text' => $question['text'],
                    'options' => $question['options'],
                    'correct_index' => $question['correct'],
                ]);
            }
        }
    }
}
