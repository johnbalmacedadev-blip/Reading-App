<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 120);
            $table->string('name_fr', 120)->nullable();
            $table->string('assessment_grade', 40)->default('Kindergarten');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('class_types')->insert([
            [
                'code' => 'JK',
                'name' => 'Junior Kindergarten (JK)',
                'name_fr' => 'Maternelle junior (JK)',
                'assessment_grade' => 'Kindergarten',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'SK',
                'name' => 'Senior Kindergarten (SK)',
                'name_fr' => 'Maternelle senior (SK)',
                'assessment_grade' => 'Kindergarten',
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'G1',
                'name' => 'Grade 1',
                'name_fr' => '1re année',
                'assessment_grade' => 'Grade 1',
                'sort_order' => 3,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'G2',
                'name' => 'Grade 2',
                'name_fr' => '2e année',
                'assessment_grade' => 'Grade 2',
                'sort_order' => 4,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'G3P',
                'name' => 'Grade 3+',
                'name_fr' => '3e année+',
                'assessment_grade' => 'Grade 3+',
                'sort_order' => 5,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('platform_settings')->updateOrInsert(
            ['key' => 'max_students_per_teacher'],
            ['value' => '30', 'created_at' => $now, 'updated_at' => $now],
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('class_types');
        DB::table('platform_settings')->where('key', 'max_students_per_teacher')->delete();
    }
};
