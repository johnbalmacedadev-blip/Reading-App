<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_contents', function (Blueprint $table) {
            $table->boolean('interactive_view')->default(false)->after('uploader');
        });

        DB::table('library_contents')
            ->whereIn(DB::raw('UPPER(format)'), ['PDF', 'PPT', 'PPTX'])
            ->update(['interactive_view' => true]);
    }

    public function down(): void
    {
        Schema::table('library_contents', function (Blueprint $table) {
            $table->dropColumn('interactive_view');
        });
    }
};
