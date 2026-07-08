<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('downloadable_categories', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('color', 20)->default('#3b82f6');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('downloadable_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('downloadable_category_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('file_path')->nullable();
            $table->string('file_format')->nullable();
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('downloadable_resources');
        Schema::dropIfExists('downloadable_categories');
    }
};
