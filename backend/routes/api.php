<?php

use App\Http\Controllers\Api\AdminStudentController;
use App\Http\Controllers\Api\AdminTeacherController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LibraryContentController;
use App\Http\Controllers\Api\PedagogicalUnitController;
use App\Http\Controllers\Api\StudentEvaluationController;
use App\Http\Controllers\Api\TeacherClassController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::prefix('admin/units')->group(function () {
    Route::get('/', [PedagogicalUnitController::class, 'index']);
    Route::post('/', [PedagogicalUnitController::class, 'store']);
    Route::get('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'show']);
    Route::put('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'update']);
    Route::delete('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'destroy']);
    Route::post('/{pedagogicalUnit}/lessons/{lessonNumber}', [PedagogicalUnitController::class, 'updateLesson']);
    Route::get('/{pedagogicalUnit}/quick-sheet/download', [PedagogicalUnitController::class, 'downloadQuickSheet']);
});

Route::prefix('library/units')->group(function () {
    Route::get('/', [PedagogicalUnitController::class, 'index']);
    Route::get('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'show']);
    Route::get('/{pedagogicalUnit}/quick-sheet/download', [PedagogicalUnitController::class, 'downloadQuickSheet']);
    Route::get('/{pedagogicalUnit}/lessons/{lessonNumber}/interactive/view', [PedagogicalUnitController::class, 'viewInteractive']);
    Route::get('/{pedagogicalUnit}/lessons/{lessonNumber}/activity-sheet/download', [PedagogicalUnitController::class, 'downloadActivitySheet']);
});

Route::prefix('admin/content')->group(function () {
    Route::get('/', [LibraryContentController::class, 'index']);
    Route::post('/', [LibraryContentController::class, 'store']);
    Route::put('/{libraryContent}', [LibraryContentController::class, 'update']);
    Route::delete('/{libraryContent}', [LibraryContentController::class, 'destroy']);
    Route::get('/{libraryContent}/view', [LibraryContentController::class, 'view']);
    Route::get('/{libraryContent}/download', [LibraryContentController::class, 'download']);
    Route::get('/{libraryContent}', [LibraryContentController::class, 'show']);
});

Route::prefix('library/content')->group(function () {
    Route::get('/', [LibraryContentController::class, 'index']);
    Route::get('/{libraryContent}/view', [LibraryContentController::class, 'view']);
    Route::get('/{libraryContent}/download', [LibraryContentController::class, 'download']);
    Route::get('/{libraryContent}', [LibraryContentController::class, 'show']);
});

Route::prefix('admin/students')->group(function () {
    Route::get('/', [AdminStudentController::class, 'index']);
    Route::get('/schools', [AdminStudentController::class, 'schools']);
    Route::post('/', [AdminStudentController::class, 'store']);
    Route::put('/{student}', [AdminStudentController::class, 'update']);
    Route::delete('/{student}', [AdminStudentController::class, 'destroy']);
});

Route::prefix('admin/teachers')->group(function () {
    Route::get('/', [AdminTeacherController::class, 'index']);
    Route::get('/schools', [AdminTeacherController::class, 'schools']);
    Route::post('/', [AdminTeacherController::class, 'store']);
    Route::put('/{teacher}', [AdminTeacherController::class, 'update']);
    Route::patch('/{teacher}/archive', [AdminTeacherController::class, 'archive']);
});

Route::middleware(['auth:sanctum'])->prefix('teacher')->group(function () {
    Route::get('/classes', [TeacherClassController::class, 'index']);
    Route::post('/classes', [TeacherClassController::class, 'store']);
    Route::get('/classes/{schoolClass}', [TeacherClassController::class, 'show']);
    Route::put('/classes/{schoolClass}', [TeacherClassController::class, 'update']);
    Route::get('/students/{student}', [TeacherClassController::class, 'showStudent']);
    Route::get('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'show']);
    Route::put('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'update']);
    Route::post('/classes/{schoolClass}/students', [TeacherClassController::class, 'addStudent']);
});
