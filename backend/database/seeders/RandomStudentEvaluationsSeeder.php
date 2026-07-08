<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\StudentEvaluation;
use Illuminate\Database\Seeder;

class RandomStudentEvaluationsSeeder extends Seeder
{
    private const STATUSES = [
        'success',
        'adequate',
        'needs-improvement',
        'not-required',
    ];

    public function run(): void
    {
        $classes = SchoolClass::query()->with('students')->get();

        foreach ($classes as $class) {
            foreach ($class->students as $student) {
                for ($atelier = 1; $atelier <= 15; $atelier++) {
                    $status = self::STATUSES[array_rand(self::STATUSES)];

                    StudentEvaluation::updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'class_id' => $class->id,
                            'atelier_number' => $atelier,
                        ],
                        [
                            'status' => $status,
                            'not_required' => $status === 'not-required',
                        ]
                    );
                }
            }
        }
    }
}
