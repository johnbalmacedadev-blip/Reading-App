<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_access_grants', function (Blueprint $table) {
            $table->id();
            $table->string('grantee_type', 20);
            $table->unsignedBigInteger('grantee_id');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['grantee_type', 'grantee_id']);
            $table->index(['grantee_type', 'grantee_id', 'enabled']);
        });

        Schema::create('resource_access_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grant_id')->constrained('resource_access_grants')->cascadeOnDelete();
            $table->string('kind', 30);
            $table->string('resource_key', 80);
            $table->timestamps();

            $table->unique(['grant_id', 'kind', 'resource_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_access_items');
        Schema::dropIfExists('resource_access_grants');
    }
};
