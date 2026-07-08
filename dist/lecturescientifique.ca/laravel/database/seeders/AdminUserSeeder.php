<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@portal.local'],
            [
                'name' => 'Admin',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('Pass'),
                'role' => 'admin',
                'account_status' => 'active',
            ]
        );
    }
}
