<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('school_board', 20)->nullable()->after('status');
            $table->foreignId('source_assessment_id')->nullable()->after('school_board')->constrained('assessments')->nullOnDelete();
            $table->index(['school_board', 'source_assessment_id']);
        });

        Schema::create('board_assessment_archives', function (Blueprint $table) {
            $table->id();
            $table->string('school_board', 20);
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['school_board', 'assessment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_assessment_archives');

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_assessment_id');
            $table->dropColumn('school_board');
        });
    }
};
