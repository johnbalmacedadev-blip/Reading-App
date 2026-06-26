<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminTeacherSeeder extends Seeder
{
    public function run(): void
    {
        $schoolIds = School::query()->pluck('id', 'name');

        $teachers = [
            ['Mrs.', 'Sophie', 'Martineau', 's.martineau@csdm.qc.ca', '514-555-0101', 'École Saint-Laurent', 'CSDM', 'active', '2023-09-01'],
            ['Mr.', 'François', 'Gagnon', 'f.gagnon@csdm.qc.ca', '514-555-0102', 'École Saint-Laurent', 'CSDM', 'active', '2023-09-01'],
            ['Mr.', 'Pierre', 'Leblanc', 'p.leblanc@csdm.qc.ca', '514-555-0103', 'École des Érables', 'CSDM', 'active', '2024-01-15'],
            ['Mrs.', 'Claire', 'Boucher', 'c.boucher@csdn.qc.ca', '418-555-0201', 'École Bois-de-Coulonge', 'CSDN', 'active', '2023-09-01'],
            ['Mrs.', 'Isabelle', 'Pelletier', 'i.pelletier@csdn.qc.ca', '418-555-0202', 'École des Sommets', 'CSDN', 'active', '2023-09-01'],
            ['Mr.', 'Jean', 'Tremblay', 'j.tremblay@csdn.qc.ca', '418-555-0203', 'École des Sommets', 'CSDN', 'active', '2024-02-01'],
            ['Mrs.', 'Andrée', 'Gagnon', 'a.gagnon@csmb.qc.ca', '514-555-0301', 'École Marguerite-d\'Youville', 'CSMB', 'active', '2023-09-01'],
            ['Mr.', 'Marc', 'Richard', 'm.richard@csmb.qc.ca', '514-555-0302', 'École du Ruisseau', 'CSMB', 'active', '2024-01-10'],
            ['Mrs.', 'Julie', 'Fortin', 'j.fortin@cspo.qc.ca', '819-555-0401', 'École des Pionniers', 'CSPO', 'active', '2023-09-01'],
            ['Mr.', 'Robert', 'Simard', 'r.simard@csdm.qc.ca', '514-555-0104', 'École Saint-Laurent', 'CSDM', 'inactive', '2022-09-01'],
            ['Mme', 'Amélie', 'Côté', 'a.cote@csdm.qc.ca', '514-555-0105', 'École Saint-Laurent', 'CSDM', 'active', '2024-03-01'],
            ['M.', 'David', 'Tremblay', 'd.tremblay@csdm.qc.ca', '514-555-0106', 'École des Érables', 'CSDM', 'active', '2023-11-15'],
            ['Mme', 'Caroline', 'Lavoie', 'c.lavoie@csdn.qc.ca', '418-555-0204', 'École Bois-de-Coulonge', 'CSDN', 'active', '2024-01-20'],
            ['M.', 'Simon', 'Bergeron', 's.bergeron@csdn.qc.ca', '418-555-0205', 'École des Sommets', 'CSDN', 'active', '2023-10-01'],
            ['Mme', 'Nathalie', 'Roy', 'n.roy@csmb.qc.ca', '514-555-0303', 'École Marguerite-d\'Youville', 'CSMB', 'active', '2024-02-15'],
            ['M.', 'Philippe', 'Gagnon', 'p.gagnon@csmb.qc.ca', '514-555-0304', 'École du Ruisseau', 'CSMB', 'active', '2023-09-15'],
            ['Mme', 'Isabelle', 'Morin', 'i.morin@cspo.qc.ca', '819-555-0402', 'École des Pionniers', 'CSPO', 'active', '2024-04-01'],
            ['M.', 'Luc', 'Bergeron', 'l.bergeron@csdm.qc.ca', '514-555-0107', 'École Saint-Joseph', 'CSDM', 'active', '2023-08-20'],
            ['Mme', 'Marie', 'Côté', 'm.cote@csdn.qc.ca', '418-555-0206', 'École Bois-de-Coulonge', 'CSDN', 'archived', '2021-09-01'],
            ['M.', 'Patrick', 'Lapointe', 'p.lapointe@cspo.qc.ca', '819-555-0403', 'École des Pionniers', 'CSPO', 'active', '2024-05-10'],
        ];

        foreach ($teachers as [$title, $first, $last, $email, $phone, $schoolName, $board, $status, $since]) {
            $schoolId = $schoolIds[$schoolName] ?? null;
            if (! $schoolId) {
                continue;
            }

            $name = trim("{$title} {$first} {$last}");

            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'first_name' => $first,
                    'last_name' => $last,
                    'title' => $title,
                    'phone' => $phone,
                    'school_id' => $schoolId,
                    'school_board' => $board,
                    'account_status' => $status,
                    'started_at' => $since,
                    'role' => 'teacher',
                    'password' => 'password',
                ]
            );
        }
    }
}
