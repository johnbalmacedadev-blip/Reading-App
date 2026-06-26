<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->unsignedTinyInteger('atelier_number');
            $table->string('status')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'class_id', 'atelier_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_evaluations');
    }
};
