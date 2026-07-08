<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_evaluations', function (Blueprint $table) {
            $table->boolean('not_required')->default(false)->after('status');
            $table->json('responses')->nullable()->after('comment');
        });
    }

    public function down(): void
    {
        Schema::table('student_evaluations', function (Blueprint $table) {
            $table->dropColumn(['not_required', 'responses']);
        });
    }
};
