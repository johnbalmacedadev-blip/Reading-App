<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('affiliation_type', 20)->nullable()->after('account_status');
            $table->string('requested_board_code', 50)->nullable()->after('affiliation_type');
            $table->timestamp('join_requested_at')->nullable()->after('requested_board_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['affiliation_type', 'requested_board_code', 'join_requested_at']);
        });
    }
};
