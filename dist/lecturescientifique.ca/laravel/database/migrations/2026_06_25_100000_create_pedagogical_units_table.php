<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedagogical_units', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('description')->nullable();
            $table->string('color', 20)->default('#3b82f6');
            $table->string('text_color', 20)->default('#ffffff');
            $table->json('atelier_numbers')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('quick_sheet_path')->nullable();
            $table->string('quick_sheet_format')->nullable();
            $table->unsignedBigInteger('quick_sheet_size_bytes')->default(0);
            $table->timestamps();
        });

        Schema::create('pedagogical_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedagogical_unit_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('lesson_number');
            $table->string('interactive_path')->nullable();
            $table->string('interactive_format')->nullable();
            $table->unsignedBigInteger('interactive_size_bytes')->default(0);
            $table->string('activity_sheet_path')->nullable();
            $table->string('activity_sheet_format')->nullable();
            $table->unsignedBigInteger('activity_sheet_size_bytes')->default(0);
            $table->timestamps();

            $table->unique(['pedagogical_unit_id', 'lesson_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedagogical_lessons');
        Schema::dropIfExists('pedagogical_units');
    }
};
