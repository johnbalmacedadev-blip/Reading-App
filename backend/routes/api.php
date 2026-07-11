<?php

use App\Http\Controllers\Api\AdminAssessmentController;
use App\Http\Controllers\Api\AdminAuditController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminSchoolController;
use App\Http\Controllers\Api\AdminSchoolBoardController;
use App\Http\Controllers\Api\AdminSchoolYearController;
use App\Http\Controllers\Api\AdminStudentController;
use App\Http\Controllers\Api\AdminTeacherController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardAssessmentController;
use App\Http\Controllers\Api\BoardDashboardController;
use App\Http\Controllers\Api\BoardProfileController;
use App\Http\Controllers\Api\BoardReportsController;
use App\Http\Controllers\Api\DownloadableResourceController;
use App\Http\Controllers\Api\LibraryContentController;
use App\Http\Controllers\Api\PedagogicalUnitController;
use App\Http\Controllers\Api\SchoolAcademicsController;
use App\Http\Controllers\Api\SchoolAssessmentController;
use App\Http\Controllers\Api\SchoolReportsController;
use App\Http\Controllers\Api\SchoolYearController;
use App\Http\Controllers\Api\TeacherReportsController;
use App\Http\Controllers\Api\StudentEvaluationController;
use App\Http\Controllers\Api\TeacherAssessmentController;
use App\Http\Controllers\Api\TeacherClassController;
use App\Http\Controllers\Api\TeacherProfileController;
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

Route::get('/library/continuum/download', [LibraryContentController::class, 'downloadContinuum']);

Route::get('/admin/dashboard', [AdminDashboardController::class, 'index']);

Route::prefix('admin/audit')->group(function () {
    Route::get('/', [AdminAuditController::class, 'index']);
    Route::get('/export', [AdminAuditController::class, 'export']);
});

Route::get('/school-years', [SchoolYearController::class, 'index']);

Route::prefix('admin/school-years')->group(function () {
    Route::get('/', [AdminSchoolYearController::class, 'index']);
    Route::post('/', [AdminSchoolYearController::class, 'store']);
    Route::patch('/{schoolYear}/default', [AdminSchoolYearController::class, 'setDefault']);
});

Route::prefix('admin/assessments')->group(function () {
    Route::get('/', [AdminAssessmentController::class, 'index']);
    Route::post('/', [AdminAssessmentController::class, 'store']);
    Route::put('/{assessment}', [AdminAssessmentController::class, 'update']);
    Route::delete('/{assessment}', [AdminAssessmentController::class, 'destroy']);
    Route::patch('/{assessment}/archive', [AdminAssessmentController::class, 'archive']);
    Route::patch('/{assessment}/restore', [AdminAssessmentController::class, 'restore']);
    Route::post('/{assessment}/duplicate', [AdminAssessmentController::class, 'duplicate']);
});

Route::prefix('admin/downloadable-categories')->group(function () {
    Route::get('/', [DownloadableResourceController::class, 'index']);
    Route::get('/{downloadableCategory}', [DownloadableResourceController::class, 'show']);
    Route::put('/{downloadableCategory}', [DownloadableResourceController::class, 'update']);
    Route::post('/{downloadableCategory}/resources', [DownloadableResourceController::class, 'storeResource']);
});

Route::prefix('admin/downloadable-resources')->group(function () {
    Route::put('/{downloadableResource}', [DownloadableResourceController::class, 'updateResource']);
    Route::delete('/{downloadableResource}', [DownloadableResourceController::class, 'destroyResource']);
    Route::get('/{downloadableResource}/download', [DownloadableResourceController::class, 'download']);
});

Route::prefix('library/downloadable-categories')->group(function () {
    Route::get('/', [DownloadableResourceController::class, 'index']);
});

Route::get('/library/downloadable-resources/{downloadableResource}/download', [DownloadableResourceController::class, 'download']);

Route::prefix('admin/school-boards')->group(function () {
    Route::get('/', [AdminSchoolBoardController::class, 'index']);
    Route::post('/suggest-credentials', [AdminSchoolBoardController::class, 'suggestCredentials']);
    Route::post('/', [AdminSchoolBoardController::class, 'store']);
    Route::put('/{schoolBoard}', [AdminSchoolBoardController::class, 'update']);
    Route::patch('/{schoolBoard}/archive', [AdminSchoolBoardController::class, 'archive']);
});

Route::prefix('admin/schools')->group(function () {
    Route::get('/', [AdminSchoolController::class, 'index']);
    Route::post('/suggest-credentials', [AdminSchoolController::class, 'suggestCredentials']);
    Route::post('/', [AdminSchoolController::class, 'store']);
    Route::put('/{school}', [AdminSchoolController::class, 'update']);
    Route::patch('/{school}/archive', [AdminSchoolController::class, 'archive']);
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
    Route::post('/suggest-credentials', [AdminTeacherController::class, 'suggestCredentials']);
    Route::post('/', [AdminTeacherController::class, 'store']);
    Route::put('/{teacher}', [AdminTeacherController::class, 'update']);
    Route::patch('/{teacher}/archive', [AdminTeacherController::class, 'archive']);
    Route::get('/{teacher}/avatar', [AdminTeacherController::class, 'showAvatar']);
});

Route::middleware(['auth:sanctum'])->prefix('teacher')->group(function () {
    Route::get('/profile', [TeacherProfileController::class, 'show']);
    Route::put('/profile', [TeacherProfileController::class, 'update']);
    Route::get('/profile/avatar', [TeacherProfileController::class, 'showAvatar']);
    Route::post('/profile/avatar', [TeacherProfileController::class, 'uploadAvatar']);
    Route::get('/classes', [TeacherClassController::class, 'index']);
    Route::get('/assessments', [TeacherAssessmentController::class, 'index']);
    Route::get('/assessments/published', [TeacherAssessmentController::class, 'published']);
    Route::get('/assessments/{assessment}', [TeacherAssessmentController::class, 'show']);
    Route::put('/assessments/{assessment}', [TeacherAssessmentController::class, 'update']);
    Route::patch('/assessments/{assessment}/activate', [TeacherAssessmentController::class, 'activate']);
    Route::post('/classes', [TeacherClassController::class, 'store']);
    Route::get('/classes/{schoolClass}', [TeacherClassController::class, 'show']);
    Route::put('/classes/{schoolClass}', [TeacherClassController::class, 'update']);
    Route::get('/students/{student}', [TeacherClassController::class, 'showStudent']);
    Route::get('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'show']);
    Route::put('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'update']);
    Route::post('/classes/{schoolClass}/students', [TeacherClassController::class, 'addStudent']);
    Route::get('/reports', [TeacherReportsController::class, 'index']);
});

Route::middleware(['auth:sanctum'])->prefix('school')->group(function () {
    Route::get('/reports', [SchoolReportsController::class, 'index']);
    Route::get('/academics', [SchoolAcademicsController::class, 'index']);
    Route::get('/assessments', [SchoolAssessmentController::class, 'index']);
    Route::get('/assessments/{assessment}', [SchoolAssessmentController::class, 'show']);
    Route::put('/assessments/{assessment}', [SchoolAssessmentController::class, 'update']);
    Route::patch('/assessments/{assessment}/activate', [SchoolAssessmentController::class, 'activate']);
});

Route::middleware(['auth:sanctum'])->prefix('board')->group(function () {
    Route::get('/dashboard', [BoardDashboardController::class, 'index']);
    Route::get('/reports', [BoardReportsController::class, 'index']);
    Route::get('/profile', [BoardProfileController::class, 'show']);
    Route::put('/profile', [BoardProfileController::class, 'update']);
    Route::get('/profile/avatar', [BoardProfileController::class, 'showAvatar']);
    Route::post('/profile/avatar', [BoardProfileController::class, 'uploadAvatar']);
    Route::get('/assessments', [BoardAssessmentController::class, 'index']);
    Route::get('/assessments/{assessment}', [BoardAssessmentController::class, 'show']);
    Route::put('/assessments/{assessment}', [BoardAssessmentController::class, 'update']);
    Route::patch('/assessments/{assessment}/activate', [BoardAssessmentController::class, 'activate']);
});
