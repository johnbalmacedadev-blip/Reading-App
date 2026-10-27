<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('registration_source', 40)->nullable()->after('affiliation_type');
        });

        // Backfill teachers already marked institutional from school/board registration.
        DB::table('users')
            ->where('role', 'teacher')
            ->where('subscription_plan', 'institutional')
            ->whereNull('registration_source')
            ->whereNotNull('school_id')
            ->update([
                'registration_source' => 'school_registration',
                'affiliation_type' => 'institutional',
                'trial_started_at' => null,
                'trial_ends_at' => null,
                'subscription_status' => 'active',
                'account_status' => 'active',
            ]);

        DB::table('users')
            ->where('role', 'teacher')
            ->where('subscription_plan', 'institutional')
            ->whereNull('registration_source')
            ->update([
                'registration_source' => 'board_registration',
                'affiliation_type' => 'institutional',
                'trial_started_at' => null,
                'trial_ends_at' => null,
                'subscription_status' => 'active',
                'account_status' => 'active',
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('registration_source');
        });
    }
};
