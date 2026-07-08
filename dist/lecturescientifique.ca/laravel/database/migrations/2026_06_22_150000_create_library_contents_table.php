<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_contents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type');
            $table->string('unit')->default('General');
            $table->unsignedSmallInteger('atelier')->default(0);
            $table->string('format')->default('PDF');
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->string('file_path')->nullable();
            $table->string('uploader')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_contents');
    }
};
