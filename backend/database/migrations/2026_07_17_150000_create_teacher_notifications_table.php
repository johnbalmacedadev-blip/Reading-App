<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_key')->unique();
            $table->string('type', 20)->default('info');
            $table->string('title');
            $table->text('message');
            $table->string('url')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'read_at']);
            $table->index(['teacher_id', 'dismissed_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_notifications');
    }
};
