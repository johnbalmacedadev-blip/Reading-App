<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('school_board', 20)->default('CSDM')->after('city');
            $table->string('grades')->nullable()->after('school_board');
            $table->string('status')->default('active')->after('grades');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['school_board', 'grades', 'status']);
        });
    }
};
