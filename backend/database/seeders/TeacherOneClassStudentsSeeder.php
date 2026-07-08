<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Illuminate\Database\Seeder;

class TeacherOneClassStudentsSeeder extends Seeder
{
    private const STUDENTS_PER_CLASS = 10;

    private const STUDENT_NAMES = [
        ['Amélie', 'Dubois'],
        ['Benjamin', 'Tremblay'],
        ['Charlotte', 'Gagnon'],
        ['David', 'Roy'],
        ['Émilie', 'Côté'],
        ['François', 'Bouchard'],
        ['Gabrielle', 'Gauthier'],
        ['Hugo', 'Morin'],
        ['Isabelle', 'Fortin'],
        ['Julien', 'Cloutier'],
        ['Léa', 'Bergeron'],
        ['Mathieu', 'Lapointe'],
        ['Noah', 'Simard'],
        ['Olivia', 'Pelletier'],
        ['Thomas', 'Leblanc'],
        ['Zoé', 'Dupuis'],
        ['Antoine', 'Richard'],
        ['Camille', 'Rousseau'],
        ['Étienne', 'Lachance'],
        ['Jade', 'Martin'],
        ['Lucas', 'Fortin'],
        ['Mia', 'Boucher'],
        ['Nathan', 'Gagné'],
        ['Rose', 'Caron'],
        ['Samuel', 'Paquet'],
        ['Alice', 'Beaulieu'],
        ['Félix', 'Poirier'],
        ['Inès', 'Marchand'],
        ['Louis', 'Girard'],
        ['Maya', 'Dufour'],
        ['Raphaël', 'Mercier'],
        ['Sarah', 'Lefebvre'],
        ['Victor', 'Côté'],
        ['Yasmine', 'Bélanger'],
        ['Adam', 'Gosselin'],
        ['Chloé', 'Turcotte'],
        ['Dylan', 'Hamel'],
        ['Éva', 'Paradis'],
        ['Gabriel', 'Savard'],
        ['Hannah', 'Blais'],
        ['Jacob', 'Cyr'],
        ['Lily', 'Morissette'],
        ['Maxime', 'Thibault'],
        ['Nora', 'Lavoie'],
        ['Oscar', 'Fournier'],
        ['Penny', 'Aubin'],
        ['Quentin', 'Bédard'],
        ['Romy', 'Champagne'],
        ['Simon', 'Desjardins'],
        ['Tessa', 'Vachon'],
    ];

    public function run(): void
    {
        $school = School::firstOrCreate(
            ['name' => 'École Saint-Joseph'],
            ['city' => 'Montréal']
        );

        $teacher = User::where('email', 'teacher1@gmail.com')->first();

        if (! $teacher) {
            return;
        }

        SchoolClass::firstOrCreate(
            ['teacher_id' => $teacher->id, 'name' => 'Class A'],
            [
                'school_id' => $school->id,
                'grade' => 'Maternelle',
                'school_year' => '2025-2026',
            ]
        );

        SchoolClass::firstOrCreate(
            ['teacher_id' => $teacher->id, 'name' => 'fasdf'],
            [
                'school_id' => $school->id,
                'grade' => '1re année',
                'school_year' => '2025-2026',
            ]
        );

        $classes = SchoolClass::query()
            ->where('teacher_id', $teacher->id)
            ->orderBy('name')
            ->get();

        $nameIndex = 0;

        foreach ($classes as $class) {
            $currentCount = $class->students()->count();
            $needed = self::STUDENTS_PER_CLASS - $currentCount;

            for ($i = 0; $i < $needed; $i++) {
                [$firstName, $lastName] = self::STUDENT_NAMES[$nameIndex % count(self::STUDENT_NAMES)];
                $nameIndex++;

                $student = Student::create([
                    'school_id' => $class->school_id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'grade' => $class->grade,
                    'status' => 'on_track',
                ]);

                $class->students()->attach($student->id);

                for ($atelier = 1; $atelier <= 15; $atelier++) {
                    StudentEvaluation::firstOrCreate(
                        [
                            'student_id' => $student->id,
                            'class_id' => $class->id,
                            'atelier_number' => $atelier,
                        ],
                        ['status' => null]
                    );
                }
            }
        }
    }
}
