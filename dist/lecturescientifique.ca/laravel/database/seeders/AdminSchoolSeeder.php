<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSchoolSeeder extends Seeder
{
    public function run(): void
    {
        $schools = [
            ['name' => 'École Saint-Laurent', 'board' => 'CSDM', 'city' => 'Montreal', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 9, 'students' => 218],
            ['name' => 'École des Érables', 'board' => 'CSDM', 'city' => 'Montreal', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 8, 'students' => 192],
            ['name' => 'École Bois-de-Coulonge', 'board' => 'CSDN', 'city' => 'Lévis', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 7, 'students' => 175],
            ['name' => 'École des Sommets', 'board' => 'CSDN', 'city' => 'Lévis', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 8, 'students' => 188],
            ['name' => "École Marguerite-d'Youville", 'board' => 'CSMB', 'city' => 'Montreal', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 6, 'students' => 141],
            ['name' => 'École du Ruisseau', 'board' => 'CSMB', 'city' => 'Dollard-des-Ormeaux', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 7, 'students' => 163],
            ['name' => 'École des Pionniers', 'board' => 'CSPO', 'city' => 'Gatineau', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 5, 'students' => 119],
            ['name' => 'École Bellevue', 'board' => 'CSDN', 'city' => 'Lévis', 'grades' => null, 'status' => 'archived', 'teachers' => 0, 'students' => 0],
            ['name' => 'École Saint-Joseph', 'board' => 'CSDM', 'city' => 'Montréal', 'grades' => 'K–2', 'status' => 'active', 'teachers' => 1, 'students' => 10],
        ];

        foreach ($schools as $item) {
            $school = School::updateOrCreate(
                ['name' => $item['name']],
                [
                    'city' => $item['city'],
                    'school_board' => $item['board'],
                    'grades' => $item['grades'],
                    'status' => $item['status'],
                ]
            );

            $slug = Str::slug($item['name'], '.');
            $email = "{$slug}.".strtolower($item['board']).'@portal.local';

            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $school->name,
                    'password' => Hash::make('School2026!'),
                    'role' => 'school_admin',
                    'school_id' => $school->id,
                    'school_board' => $school->school_board,
                    'account_status' => $school->status === 'archived' ? 'archived' : 'active',
                ]
            );
        }
    }
}
