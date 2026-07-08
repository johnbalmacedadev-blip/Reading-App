<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('title')->nullable()->after('last_name');
            $table->string('phone')->nullable()->after('email');
            $table->string('school_board')->nullable()->after('school_id');
            $table->string('account_status')->default('active')->after('school_board');
            $table->date('started_at')->nullable()->after('account_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['title', 'phone', 'school_board', 'account_status', 'started_at']);
        });
    }
};
