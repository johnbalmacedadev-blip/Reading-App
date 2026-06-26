<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('last_name');
            $table->string('grade')->nullable()->after('date_of_birth');
            $table->string('status')->default('on_track')->after('grade');
            $table->unsignedSmallInteger('current_atelier')->default(1)->after('status');
            $table->string('teacher_name')->nullable()->after('current_atelier');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'date_of_birth',
                'grade',
                'status',
                'current_atelier',
                'teacher_name',
            ]);
        });
    }
};
