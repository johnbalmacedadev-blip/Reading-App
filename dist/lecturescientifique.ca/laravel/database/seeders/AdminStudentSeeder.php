<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\Student;
use Illuminate\Database\Seeder;

class AdminStudentSeeder extends Seeder
{
    public function run(): void
    {
        $schools = [
            'École Saint-Laurent' => 'Montréal',
            'École des Érables' => 'Laval',
            'École Bois-de-Coulonge' => 'Québec',
            'École des Sommets' => 'Gatineau',
            'École Marguerite-d\'Youville' => 'Longueuil',
            'École du Ruisseau' => 'Sherbrooke',
            'École des Pionniers' => 'Trois-Rivières',
            'École Saint-Joseph' => 'Montréal',
        ];

        $schoolIds = [];
        foreach ($schools as $name => $city) {
            $schoolIds[$name] = School::firstOrCreate(['name' => $name], ['city' => $city])->id;
        }

        $records = [
            ['Amélie', 'Dubois', 'Kindergarten', 'École Saint-Laurent', 'Mme Martineau', 3, 'on_track', '2019-04-12'],
            ['Hugo', 'Morin', 'Kindergarten', 'École Saint-Laurent', 'Mme Martineau', 1, 'monitor', '2019-07-03'],
            ['Charlotte', 'Gagnon', 'Grade 1', 'École des Érables', 'M. Leblanc', 4, 'on_track', '2018-02-18'],
            ['Mathieu', 'Lapointe', 'Grade 1', 'École des Érables', 'M. Leblanc', 2, 'at_risk', '2018-09-11'],
            ['Antoine', 'Bergeron', 'Grade 1', 'École Bois-de-Coulonge', 'Mme Pelletier', 8, 'on_track', '2017-11-25'],
            ['Léa', 'Simard', 'Grade 1', 'École Bois-de-Coulonge', 'Mme Pelletier', 6, 'monitor', '2017-03-07'],
            ['Zoé', 'Dupuis', 'Grade 1', 'École des Sommets', 'M. Tremblay', 5, 'at_risk', '2017-08-19'],
            ['Sophie', 'Tremblay', 'Grade 2', 'École des Sommets', 'Mme Gagnon', 13, 'on_track', '2016-05-30'],
            ['Lucas', 'Fortin', 'Grade 2', 'École Marguerite-d\'Youville', 'Mme Gagnon', 10, 'monitor', '2016-01-14'],
            ['Camille', 'Rousseau', 'Grade 2', 'École du Ruisseau', 'M. Richard', 9, 'at_risk', '2016-12-02'],
            ['Noah', 'Tremblay', 'Kindergarten', 'École Saint-Laurent', 'Mme Boucher', 3, 'monitor', '2018-06-20'],
            ['Olivia', 'Roy', 'Kindergarten', 'École Saint-Laurent', 'Mme Boucher', 3, 'on_track', '2018-04-15'],
            ['Thomas', 'Leblanc', 'Grade 1', 'École des Pionniers', 'M. Tremblay', 8, 'on_track', '2017-10-08'],
            ['Jade', 'Martin', 'Grade 2', 'École des Pionniers', 'Mme Gagnon', 13, 'on_track', '2016-07-22'],
            ['Maxime', 'Lachance', 'Grade 2', 'École Bois-de-Coulonge', 'M. Richard', 12, 'on_track', '2016-03-18'],
        ];

        foreach ($records as [$first, $last, $grade, $schoolName, $teacher, $atelier, $status, $dob]) {
            Student::updateOrCreate(
                [
                    'school_id' => $schoolIds[$schoolName],
                    'first_name' => $first,
                    'last_name' => $last,
                ],
                [
                    'grade' => $grade,
                    'teacher_name' => $teacher,
                    'current_atelier' => $atelier,
                    'status' => $status,
                    'date_of_birth' => $dob,
                ]
            );
        }
    }
}
