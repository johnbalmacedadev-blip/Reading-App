<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_atelier_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('file_type', 16);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['assessment_id', 'sort_order']);
        });

        if (Schema::hasColumn('assessments', 'atelier_pdf_path')) {
            $rows = DB::table('assessments')
                ->whereNotNull('atelier_pdf_path')
                ->where('atelier_pdf_path', '!=', '')
                ->get(['id', 'atelier_pdf_path', 'atelier_pdf_name']);

            foreach ($rows as $row) {
                DB::table('assessment_atelier_files')->insert([
                    'assessment_id' => $row->id,
                    'file_path' => $row->atelier_pdf_path,
                    'original_name' => $row->atelier_pdf_name ?: 'atelier.pdf',
                    'file_type' => 'pdf',
                    'mime_type' => 'application/pdf',
                    'file_size_bytes' => 0,
                    'sort_order' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('assessments', function (Blueprint $table) {
                $table->dropColumn(['atelier_pdf_path', 'atelier_pdf_name']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            if (! Schema::hasColumn('assessments', 'atelier_pdf_path')) {
                $table->string('atelier_pdf_path')->nullable()->after('template_draft');
                $table->string('atelier_pdf_name')->nullable()->after('atelier_pdf_path');
            }
        });

        if (Schema::hasTable('assessment_atelier_files')) {
            $files = DB::table('assessment_atelier_files')
                ->where('file_type', 'pdf')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            $seen = [];
            foreach ($files as $file) {
                if (isset($seen[$file->assessment_id])) {
                    continue;
                }
                $seen[$file->assessment_id] = true;
                DB::table('assessments')->where('id', $file->assessment_id)->update([
                    'atelier_pdf_path' => $file->file_path,
                    'atelier_pdf_name' => $file->original_name,
                ]);
            }

            Schema::dropIfExists('assessment_atelier_files');
        }
    }
};
