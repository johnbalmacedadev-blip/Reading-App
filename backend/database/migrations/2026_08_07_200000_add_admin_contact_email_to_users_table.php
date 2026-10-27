<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('contact_email')->nullable()->after('email');
            $table->string('pending_contact_email')->nullable()->after('contact_email');
            $table->string('pending_username')->nullable()->after('pending_contact_email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['contact_email', 'pending_contact_email', 'pending_username']);
        });
    }
};
