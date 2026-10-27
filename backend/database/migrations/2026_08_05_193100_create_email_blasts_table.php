<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_blasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('subject', 200);
            $table->longText('body_html');
            $table->json('audiences');
            $table->json('attachments')->nullable();
            $table->unsignedInteger('delivered_count')->default(0);
            $table->unsignedInteger('email_sent')->default(0);
            $table->unsignedInteger('email_skipped')->default(0);
            $table->unsignedInteger('email_failed')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_blasts');
    }
};
