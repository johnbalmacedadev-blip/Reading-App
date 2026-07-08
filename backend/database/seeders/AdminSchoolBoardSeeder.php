<?php

namespace Database\Seeders;

use App\Models\SchoolBoard;
use Illuminate\Database\Seeder;

class AdminSchoolBoardSeeder extends Seeder
{
    public function run(): void
    {
        $boards = [
            ['name' => 'Montreal School Board (CSDM)', 'code' => 'CSDM', 'region' => 'Montreal', 'status' => 'active'],
            ['name' => 'Navigators School Board (CSDN)', 'code' => 'CSDN', 'region' => 'Lévis', 'status' => 'active'],
            ['name' => 'Marguerite-Bourgeoys School Board (CSMB)', 'code' => 'CSMB', 'region' => 'West Montreal', 'status' => 'active'],
            ['name' => "Portages-de-l'Outaouais School Board (CSPO)", 'code' => 'CSPO', 'region' => 'Outaouais', 'status' => 'active'],
            ['name' => 'Laval School Board (CSL)', 'code' => 'CSL', 'region' => 'Laval', 'status' => 'archived'],
        ];

        foreach ($boards as $board) {
            SchoolBoard::updateOrCreate(
                ['code' => $board['code']],
                $board
            );
        }
    }
}
