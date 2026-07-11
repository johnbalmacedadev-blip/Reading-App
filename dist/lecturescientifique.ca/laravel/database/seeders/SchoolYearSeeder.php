<?php

namespace Database\Seeders;

use App\Models\SchoolYear;
use Illuminate\Database\Seeder;

class SchoolYearSeeder extends Seeder
{
    public function run(): void
    {
        $years = ['2024-2025', '2025-2026'];

        foreach ($years as $label) {
            SchoolYear::query()->firstOrCreate(
                ['label' => $label],
                ['is_default' => $label === '2025-2026']
            );
        }

        if (! SchoolYear::query()->where('is_default', true)->exists()) {
            $latest = SchoolYear::query()->orderByDesc('label')->first();
            if ($latest) {
                SchoolYear::setDefault($latest);
            }
        }
    }
}
