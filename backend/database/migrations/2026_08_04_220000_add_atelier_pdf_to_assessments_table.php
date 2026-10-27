<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('atelier_pdf_path')->nullable()->after('template_draft');
            $table->string('atelier_pdf_name')->nullable()->after('atelier_pdf_path');
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['atelier_pdf_path', 'atelier_pdf_name']);
        });
    }
};
