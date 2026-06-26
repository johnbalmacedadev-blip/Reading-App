<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::firstOrCreate(
            ['name' => 'École Saint-Joseph'],
            ['city' => 'Montréal']
        );

        $teacher = User::updateOrCreate(
            ['email' => 'gisele@example.com'],
            [
                'name' => 'Gisèle Martin',
                'first_name' => 'Gisèle',
                'last_name' => 'Martin',
                'password' => 'password',
                'role' => 'teacher',
                'school_id' => $school->id,
            ]
        );

        User::updateOrCreate(
            ['email' => 'teacher1@gmail.com'],
            [
                'name' => 'Teacher One',
                'first_name' => 'Teacher',
                'last_name' => 'One',
                'password' => 'Password',
                'role' => 'teacher',
                'school_id' => $school->id,
            ]
        );

        $teacher1 = User::where('email', 'teacher1@gmail.com')->first();

        SchoolClass::firstOrCreate(
            ['teacher_id' => $teacher1->id, 'name' => 'Grade 1 — Teacher One'],
            [
                'school_id' => $school->id,
                'grade' => '1re année',
                'school_year' => '2025-2026',
            ]
        );

        $class = SchoolClass::firstOrCreate(
            ['teacher_id' => $teacher->id, 'name' => '1re année Mme Gisèle'],
            [
                'school_id' => $school->id,
                'grade' => '1re année',
                'school_year' => '2025-2026',
            ]
        );

        $studentNames = [
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
        ];

        foreach ($studentNames as [$firstName, $lastName]) {
            $student = Student::firstOrCreate(
                [
                    'school_id' => $school->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]
            );

            if (! $class->students()->where('student_id', $student->id)->exists()) {
                $class->students()->attach($student->id);
            }

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

        $this->call(LibraryContentSeeder::class);
        $this->call(PedagogicalUnitSeeder::class);
        $this->call(AdminStudentSeeder::class);
        $this->call(AdminTeacherSeeder::class);
    }
}