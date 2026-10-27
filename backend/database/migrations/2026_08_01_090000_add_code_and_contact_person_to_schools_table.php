<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('code', 40)->nullable()->after('school_board');
            $table->string('contact_person')->nullable()->after('code');
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'contact_person']);
        });
    }
};
