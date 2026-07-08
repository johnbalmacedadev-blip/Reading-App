<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AmelieDemoReportSeeder extends Seeder
{
    /** @var array<int, array{status: string, date: string, comment?: string}> */
    private const DEMO_EVALUATIONS = [
        1 => ['status' => 'success', 'date' => '2025-09-15', 'comment' => 'Excellente maîtrise des lettres majuscules'],
        2 => ['status' => 'success', 'date' => '2025-09-22'],
        3 => ['status' => 'adequate', 'date' => '2025-09-29', 'comment' => 'Besoin de pratique supplémentaire avec les sons CH et J'],
        4 => ['status' => 'success', 'date' => '2025-10-06'],
        5 => ['status' => 'success', 'date' => '2025-10-13'],
        6 => ['status' => 'adequate', 'date' => '2025-10-20'],
        7 => ['status' => 'success', 'date' => '2025-10-27'],
        8 => ['status' => 'success', 'date' => '2025-11-03'],
    ];

    public function run(): void
    {
        $class = SchoolClass::query()
            ->where('name', '1re année Mme Gisèle')
            ->first();

        if (! $class) {
            return;
        }

        $student = Student::query()
            ->where('first_name', 'Amélie')
            ->where('last_name', 'Dubois')
            ->first();

        if (! $student) {
            return;
        }

        if (! $class->students()->where('student_id', $student->id)->exists()) {
            $class->students()->attach($student->id);
        }

        for ($atelier = 1; $atelier <= 15; $atelier++) {
            $payload = self::DEMO_EVALUATIONS[$atelier] ?? null;

            StudentEvaluation::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'class_id' => $class->id,
                    'atelier_number' => $atelier,
                ],
                [
                    'status' => $payload['status'] ?? null,
                    'not_required' => false,
                    'comment' => $payload['comment'] ?? null,
                    'updated_at' => isset($payload['date'])
                        ? Carbon::parse($payload['date'])->startOfDay()
                        : now(),
                ]
            );
        }
    }
}
