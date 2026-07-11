<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('school_id')->nullable()->after('source_assessment_id')->constrained('schools')->nullOnDelete();
            $table->index(['school_id', 'source_assessment_id']);
        });

        Schema::create('school_assessment_archives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['school_id', 'assessment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_assessment_archives');

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_id');
        });
    }
};
