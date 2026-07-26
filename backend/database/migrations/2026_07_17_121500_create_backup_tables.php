<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->string('frequency', 20)->default('daily');
            $table->time('time')->default('02:00');
            $table->unsignedTinyInteger('day_of_week')->default(0);
            $table->unsignedTinyInteger('day_of_month')->default(1);
            $table->string('backup_type', 20)->default('database');
            $table->unsignedSmallInteger('retention_count')->default(7);
            $table->string('timezone', 64)->default('America/Toronto');
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();
        });

        Schema::create('backup_records', function (Blueprint $table) {
            $table->id();
            $table->string('filename')->unique();
            $table->string('type', 20);
            $table->string('trigger', 20)->default('manual');
            $table->string('disk', 40)->default('local');
            $table->unsignedBigInteger('size')->nullable();
            $table->string('status', 20)->default('running');
            $table->text('error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['trigger', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_records');
        Schema::dropIfExists('backup_settings');
    }
};
