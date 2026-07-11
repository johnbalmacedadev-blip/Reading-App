<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->after('school_id')->constrained('users')->nullOnDelete();
            $table->index(['teacher_id', 'source_assessment_id']);
        });

        Schema::create('teacher_assessment_archives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['teacher_id', 'assessment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_assessment_archives');

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('teacher_id');
        });
    }
};
