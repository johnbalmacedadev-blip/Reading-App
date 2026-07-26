<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('platform_settings')->insert([
            ['key' => 'default_language', 'value' => 'fr', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'date_format', 'value' => 'DD/MM/YYYY', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'number_format', 'value' => 'fr', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'timezone', 'value' => 'America/Toronto', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'platform_name', 'value' => 'Lecture Scientifique', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'support_email', 'value' => 'support@lecturesci.ca', 'created_at' => $now, 'updated_at' => $now],
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->string('preferred_language', 5)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('preferred_language');
        });

        Schema::dropIfExists('platform_settings');
    }
};
