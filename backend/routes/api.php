<?php

use App\Http\Controllers\Api\AccountActivationController;
use App\Http\Controllers\Api\AdminClassTypeController;
use App\Http\Controllers\Api\AdminAssessmentController;
use App\Http\Controllers\Api\AdminAnnouncementController;
use App\Http\Controllers\Api\AdminAuditController;
use App\Http\Controllers\Api\AdminBackupController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminEmailBlastController;
use App\Http\Controllers\Api\AdminSchoolController;
use App\Http\Controllers\Api\AdminSchoolBoardController;
use App\Http\Controllers\Api\AdminSchoolYearController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\AdminProfileController;
use App\Http\Controllers\Api\AdminAccountChangeConfirmController;
use App\Http\Controllers\Api\AdminStudentController;
use App\Http\Controllers\Api\AdminSupportTicketController;
use App\Http\Controllers\Api\AdminResourceAccessController;
use App\Http\Controllers\Api\AdminTeacherController;
use App\Http\Controllers\Api\BrandingController;
use App\Http\Controllers\Api\SignupController;
use App\Http\Controllers\Api\SignupDirectoryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardAssessmentController;
use App\Http\Controllers\Api\BoardDashboardController;
use App\Http\Controllers\Api\BoardProfileController;
use App\Http\Controllers\Api\BoardReportsController;
use App\Http\Controllers\Api\BoardSchoolController;
use App\Http\Controllers\Api\BoardSettingsController;
use App\Http\Controllers\Api\BoardTeacherController;
use App\Http\Controllers\Api\BoardTeacherRequestController;
use App\Http\Controllers\Api\DownloadableResourceController;
use App\Http\Controllers\Api\LibraryContentController;
use App\Http\Controllers\Api\PedagogicalUnitController;
use App\Http\Controllers\Api\SchoolAcademicsController;
use App\Http\Controllers\Api\SchoolAssessmentController;
use App\Http\Controllers\Api\SchoolProfileController;
use App\Http\Controllers\Api\SchoolReportsController;
use App\Http\Controllers\Api\SchoolTeacherController;
use App\Http\Controllers\Api\SchoolTeacherRequestController;
use App\Http\Controllers\Api\SchoolYearController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\TeacherReportsController;
use App\Http\Controllers\Api\StudentEvaluationController;
use App\Http\Controllers\Api\TeacherAssessmentController;
use App\Http\Controllers\Api\TeacherClassController;
use App\Http\Controllers\Api\TeacherProfileController;
use App\Http\Controllers\Api\TeacherNotificationController;
use App\Http\Controllers\Api\TeacherSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::post('/signup/complete', [SignupController::class, 'complete']);
Route::get('/signup/schools', [SignupDirectoryController::class, 'schools']);
Route::get('/signup/school-boards', [SignupDirectoryController::class, 'boards']);
Route::post('/forgot-password', [SignupController::class, 'forgotPassword']);
Route::post('/reset-password', [SignupController::class, 'resetPassword']);
Route::get('/activate-account/{user}', AccountActivationController::class)
    ->name('account.activate')
    ->middleware('signed');

Route::get('/admin/confirm-account-change/{user}', AdminAccountChangeConfirmController::class)
    ->name('admin.account.confirm')
    ->middleware('signed');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');
Route::post('/stripe/webhook', [TeacherSubscriptionController::class, 'webhook']);

Route::prefix('admin/units')->group(function () {
    Route::get('/', [PedagogicalUnitController::class, 'index']);
    Route::post('/', [PedagogicalUnitController::class, 'store']);
    Route::get('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'show']);
    Route::put('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'update']);
    Route::delete('/{pedagogicalUnit}', [PedagogicalUnitController::class, 'destroy']);
    Route::post('/{pedagogicalUnit}/lessons/{lessonNumber}', [PedagogicalUnitController::class, 'updateLesson']);
    Route::get('/{pedagogicalUnit}/quick-sheet/download', [PedagogicalUnitController::class, 'downloadQuickSheet']);
});

Route::middleware('auth:sanctum')->prefix('library/units')->group(function () {
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

Route::middleware('auth:sanctum')->prefix('library/content')->group(function () {
    Route::get('/', [LibraryContentController::class, 'index']);
    Route::get('/{libraryContent}/view', [LibraryContentController::class, 'view']);
    Route::get('/{libraryContent}/download', [LibraryContentController::class, 'download']);
    Route::get('/{libraryContent}', [LibraryContentController::class, 'show']);
});

Route::middleware('auth:sanctum')->get('/library/continuum/download', [LibraryContentController::class, 'downloadContinuum']);

Route::get('/admin/dashboard', [AdminDashboardController::class, 'index']);
Route::get('/admin/activity', [AdminDashboardController::class, 'activity']);

Route::prefix('admin/audit')->group(function () {
    Route::get('/', [AdminAuditController::class, 'index']);
    Route::get('/export', [AdminAuditController::class, 'export']);
});

Route::get('/branding', [BrandingController::class, 'show']);
Route::get('/branding/favicon', [BrandingController::class, 'favicon']);
Route::get('/branding/email-logo', [BrandingController::class, 'emailLogo']);
Route::get('/branding/logo/{variant}', [BrandingController::class, 'logo'])
    ->where('variant', 'platform|login');

Route::middleware('auth:sanctum')->prefix('admin/settings')->group(function () {
    Route::get('/', [AdminSettingsController::class, 'show']);
    Route::put('/', [AdminSettingsController::class, 'update']);
    Route::get('/email-templates', [AdminSettingsController::class, 'emailTemplates']);
    Route::put('/email-templates', [AdminSettingsController::class, 'updateEmailTemplates']);
    Route::get('/email-logo', [AdminSettingsController::class, 'emailLogo']);
    Route::post('/email-logo', [AdminSettingsController::class, 'uploadEmailLogo']);
    Route::delete('/email-logo', [AdminSettingsController::class, 'resetEmailLogo']);
    Route::get('/favicon', [AdminSettingsController::class, 'favicon']);
    Route::post('/favicon', [AdminSettingsController::class, 'uploadFavicon']);
    Route::delete('/favicon', [AdminSettingsController::class, 'resetFavicon']);
    Route::post('/platform-logo', [AdminSettingsController::class, 'uploadPlatformLogo']);
    Route::delete('/platform-logo', [AdminSettingsController::class, 'resetPlatformLogo']);
    Route::post('/login-logo', [AdminSettingsController::class, 'uploadLoginLogo']);
    Route::delete('/login-logo', [AdminSettingsController::class, 'resetLoginLogo']);
});

Route::middleware('auth:sanctum')->prefix('admin/profile')->group(function () {
    Route::get('/', [AdminProfileController::class, 'show']);
    Route::put('/', [AdminProfileController::class, 'update']);
});

Route::middleware('auth:sanctum')->prefix('admin/announcements')->group(function () {
    Route::get('/', [AdminAnnouncementController::class, 'index']);
    Route::post('/', [AdminAnnouncementController::class, 'store']);
    Route::delete('/', [AdminAnnouncementController::class, 'clearAll']);
});

Route::middleware('auth:sanctum')->prefix('admin/email-blasts')->group(function () {
    Route::get('/', [AdminEmailBlastController::class, 'index']);
    Route::post('/preview-count', [AdminEmailBlastController::class, 'previewCount']);
    Route::post('/', [AdminEmailBlastController::class, 'store']);
    Route::delete('/', [AdminEmailBlastController::class, 'clearAll']);
});

Route::middleware('auth:sanctum')->prefix('admin/support-tickets')->group(function () {
    Route::get('/', [AdminSupportTicketController::class, 'index']);
    Route::patch('/{supportTicket}', [AdminSupportTicketController::class, 'update']);
});

Route::middleware('auth:sanctum')->prefix('support')->group(function () {
    Route::get('/', [SupportTicketController::class, 'info']);
    Route::get('/tickets', [SupportTicketController::class, 'index']);
    Route::post('/tickets', [SupportTicketController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('admin/backups')->group(function () {
    Route::get('/', [AdminBackupController::class, 'index']);
    Route::post('/', [AdminBackupController::class, 'create']);
    Route::put('/settings', [AdminBackupController::class, 'updateSettings']);
    Route::post('/run-scheduled', [AdminBackupController::class, 'runScheduled']);
    Route::get('/{backup}/download', [AdminBackupController::class, 'download']);
    Route::delete('/{backup}', [AdminBackupController::class, 'destroy']);
});

Route::get('/school-years', [SchoolYearController::class, 'index']);

Route::prefix('admin/school-years')->group(function () {
    Route::get('/', [AdminSchoolYearController::class, 'index']);
    Route::post('/', [AdminSchoolYearController::class, 'store']);
    Route::patch('/{schoolYear}/default', [AdminSchoolYearController::class, 'setDefault']);
    Route::delete('/{schoolYear}', [AdminSchoolYearController::class, 'destroy']);
});

Route::prefix('admin/assessments')->group(function () {
    Route::get('/', [AdminAssessmentController::class, 'index']);
    Route::post('/', [AdminAssessmentController::class, 'store']);
    Route::delete('/archived', [AdminAssessmentController::class, 'clearArchived']);
    Route::put('/{assessment}', [AdminAssessmentController::class, 'update']);
    Route::delete('/{assessment}', [AdminAssessmentController::class, 'destroy']);
    Route::patch('/{assessment}/archive', [AdminAssessmentController::class, 'archive']);
    Route::patch('/{assessment}/restore', [AdminAssessmentController::class, 'restore']);
    Route::post('/{assessment}/duplicate', [AdminAssessmentController::class, 'duplicate']);
    Route::post('/{assessment}/atelier-files', [AdminAssessmentController::class, 'uploadAtelierFiles']);
    Route::post('/{assessment}/atelier-pdf', [AdminAssessmentController::class, 'replaceAtelierPdf']);
    Route::delete('/{assessment}/atelier-files/{atelierFile}', [AdminAssessmentController::class, 'destroyAtelierFile']);
    Route::get('/{assessment}/atelier-files/{atelierFile}/download', [AdminAssessmentController::class, 'downloadAtelierFile']);
    Route::get('/{assessment}/atelier-files/{atelierFile}/view', [AdminAssessmentController::class, 'viewAtelierFile']);
});

Route::middleware('auth:sanctum')->get('/admin/resource-access/catalog', [AdminResourceAccessController::class, 'catalog']);

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

Route::middleware('auth:sanctum')->prefix('library/downloadable-categories')->group(function () {
    Route::get('/', [DownloadableResourceController::class, 'index']);
});

Route::middleware('auth:sanctum')->get('/library/downloadable-resources/{downloadableResource}/download', [DownloadableResourceController::class, 'download']);

Route::prefix('admin/school-boards')->group(function () {
    Route::get('/', [AdminSchoolBoardController::class, 'index']);
    Route::post('/suggest-credentials', [AdminSchoolBoardController::class, 'suggestCredentials']);
    Route::post('/', [AdminSchoolBoardController::class, 'store']);
    Route::get('/{schoolBoard}', [AdminSchoolBoardController::class, 'show']);
    Route::match(['put', 'post'], '/{schoolBoard}', [AdminSchoolBoardController::class, 'update']);
    Route::post('/{schoolBoard}/send-billing-notice', [AdminSchoolBoardController::class, 'sendBillingNotice'])->middleware('auth:sanctum');
    Route::post('/{schoolBoard}/resend-activation', [AdminSchoolBoardController::class, 'resendActivation'])->middleware('auth:sanctum');
    Route::patch('/{schoolBoard}/activate-account', [AdminSchoolBoardController::class, 'activateAccount'])->middleware('auth:sanctum');
    Route::patch('/{schoolBoard}/archive', [AdminSchoolBoardController::class, 'archive']);
    Route::delete('/{schoolBoard}', [AdminSchoolBoardController::class, 'destroy']);
});

Route::prefix('admin/schools')->group(function () {
    Route::get('/', [AdminSchoolController::class, 'index']);
    Route::post('/suggest-credentials', [AdminSchoolController::class, 'suggestCredentials']);
    Route::post('/', [AdminSchoolController::class, 'store']);
    Route::get('/{school}', [AdminSchoolController::class, 'show']);
    Route::match(['put', 'post'], '/{school}', [AdminSchoolController::class, 'update']);
    Route::post('/{school}/send-billing-notice', [AdminSchoolController::class, 'sendBillingNotice'])->middleware('auth:sanctum');
    Route::post('/{school}/extend-trial', [AdminSchoolController::class, 'extendTrial'])->middleware('auth:sanctum');
    Route::post('/{school}/resend-activation', [AdminSchoolController::class, 'resendActivation'])->middleware('auth:sanctum');
    Route::patch('/{school}/activate-account', [AdminSchoolController::class, 'activateAccount'])->middleware('auth:sanctum');
    Route::patch('/{school}/archive', [AdminSchoolController::class, 'archive']);
    Route::delete('/{school}', [AdminSchoolController::class, 'destroy']);
    Route::get('/{school}/resource-access', [AdminResourceAccessController::class, 'showSchool'])->middleware('auth:sanctum');
    Route::put('/{school}/resource-access', [AdminResourceAccessController::class, 'updateSchool'])->middleware('auth:sanctum');
});

Route::prefix('admin/students')->group(function () {
    Route::get('/', [AdminStudentController::class, 'index']);
    Route::get('/schools', [AdminStudentController::class, 'schools']);
    Route::get('/teachers', [AdminStudentController::class, 'teachers']);
    Route::post('/', [AdminStudentController::class, 'store']);
    Route::match(['put', 'post'], '/{student}', [AdminStudentController::class, 'update']);
    Route::delete('/{student}', [AdminStudentController::class, 'destroy']);
});

Route::prefix('admin/teachers')->group(function () {
    Route::get('/', [AdminTeacherController::class, 'index']);
    Route::get('/schools', [AdminTeacherController::class, 'schools']);
    Route::post('/suggest-credentials', [AdminTeacherController::class, 'suggestCredentials']);
    Route::post('/', [AdminTeacherController::class, 'store']);
    Route::get('/{teacher}', [AdminTeacherController::class, 'show']);
    Route::match(['put', 'post'], '/{teacher}', [AdminTeacherController::class, 'update']);
    Route::post('/{teacher}/resend-activation', [AdminTeacherController::class, 'resendActivation'])->middleware('auth:sanctum');
    Route::patch('/{teacher}/activate-account', [AdminTeacherController::class, 'activateAccount'])->middleware('auth:sanctum');
    Route::post('/{teacher}/send-billing-notice', [AdminTeacherController::class, 'sendBillingNotice'])->middleware('auth:sanctum');
    Route::post('/{teacher}/extend-trial', [AdminTeacherController::class, 'extendTrial'])->middleware('auth:sanctum');
    Route::post('/{teacher}/send-inactivity-notice', [AdminTeacherController::class, 'sendInactivityNotice'])->middleware('auth:sanctum');
    Route::patch('/{teacher}/archive', [AdminTeacherController::class, 'archive']);
    Route::delete('/{teacher}', [AdminTeacherController::class, 'destroy']);
    Route::get('/{teacher}/avatar', [AdminTeacherController::class, 'showAvatar']);
    Route::get('/{teacher}/resource-access', [AdminResourceAccessController::class, 'showTeacher'])->middleware('auth:sanctum');
    Route::put('/{teacher}/resource-access', [AdminResourceAccessController::class, 'updateTeacher'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->prefix('admin/class-types')->group(function () {
    Route::get('/', [AdminClassTypeController::class, 'index']);
    Route::post('/', [AdminClassTypeController::class, 'store']);
    Route::put('/limit', [AdminClassTypeController::class, 'updateLimit']);
    Route::put('/{classType}', [AdminClassTypeController::class, 'update']);
    Route::delete('/{classType}', [AdminClassTypeController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'teacher.entitled'])->prefix('teacher')->group(function () {
    Route::get('/subscription', [TeacherSubscriptionController::class, 'show']);
    Route::post('/subscription/checkout', [TeacherSubscriptionController::class, 'checkout']);
    Route::post('/subscription/confirm', [TeacherSubscriptionController::class, 'confirm']);
    Route::post('/subscription/portal', [TeacherSubscriptionController::class, 'portal']);
    Route::get('/notifications', [TeacherNotificationController::class, 'index']);
    Route::post('/notifications/read-all', [TeacherNotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [TeacherNotificationController::class, 'markRead']);
    Route::delete('/notifications/{notification}', [TeacherNotificationController::class, 'destroy']);
    Route::get('/profile', [TeacherProfileController::class, 'show']);
    Route::put('/profile', [TeacherProfileController::class, 'update']);
    Route::get('/profile/avatar', [TeacherProfileController::class, 'showAvatar']);
    Route::post('/profile/avatar', [TeacherProfileController::class, 'uploadAvatar']);
    Route::middleware('teacher.classroom')->group(function () {
        Route::get('/classes', [TeacherClassController::class, 'index']);
        Route::get('/class-types', [TeacherClassController::class, 'classTypes']);
        Route::get('/assessments', [TeacherAssessmentController::class, 'index']);
        Route::get('/assessments/published', [TeacherAssessmentController::class, 'published']);
        Route::get('/assessments/atelier-files/{atelierFile}/download', [TeacherAssessmentController::class, 'downloadAtelierFile']);
        Route::get('/assessments/{assessment}', [TeacherAssessmentController::class, 'show']);
        Route::put('/assessments/{assessment}', [TeacherAssessmentController::class, 'update']);
        Route::patch('/assessments/{assessment}/activate', [TeacherAssessmentController::class, 'activate']);
        Route::post('/classes', [TeacherClassController::class, 'store']);
        Route::get('/classes/{schoolClass}', [TeacherClassController::class, 'show']);
        Route::put('/classes/{schoolClass}', [TeacherClassController::class, 'update']);
        Route::delete('/classes/{schoolClass}', [TeacherClassController::class, 'destroy']);
        Route::get('/students/{student}', [TeacherClassController::class, 'showStudent']);
        Route::delete('/students/{student}', [TeacherClassController::class, 'destroyStudent']);
        Route::get('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'show']);
        Route::put('/students/{student}/evaluations/{atelierNumber}', [StudentEvaluationController::class, 'update']);
        Route::post('/classes/{schoolClass}/students', [TeacherClassController::class, 'addStudent']);
        Route::get('/reports', [TeacherReportsController::class, 'index']);
    });
});

Route::middleware(['auth:sanctum', 'institutional.entitled:school_admin'])->prefix('school')->group(function () {
    Route::get('/reports', [SchoolReportsController::class, 'index']);
    Route::get('/academics', [SchoolAcademicsController::class, 'index']);
    Route::get('/teachers', [SchoolTeacherController::class, 'index']);
    Route::get('/teacher-requests', [SchoolTeacherRequestController::class, 'index']);
    Route::patch('/teacher-requests/{teacher}/accept', [SchoolTeacherRequestController::class, 'accept']);
    Route::patch('/teacher-requests/{teacher}/reject', [SchoolTeacherRequestController::class, 'reject']);
    Route::get('/assessments', [SchoolAssessmentController::class, 'index']);
    Route::get('/assessments/{assessment}', [SchoolAssessmentController::class, 'show']);
    Route::put('/assessments/{assessment}', [SchoolAssessmentController::class, 'update']);
    Route::patch('/assessments/{assessment}/activate', [SchoolAssessmentController::class, 'activate']);
    Route::get('/profile', [SchoolProfileController::class, 'show']);
    Route::put('/profile', [SchoolProfileController::class, 'update']);
    Route::get('/profile/avatar', [SchoolProfileController::class, 'showAvatar']);
    Route::post('/profile/avatar', [SchoolProfileController::class, 'uploadAvatar']);
});

Route::middleware(['auth:sanctum', 'institutional.entitled:board_admin'])->prefix('board')->group(function () {
    Route::get('/dashboard', [BoardDashboardController::class, 'index']);
    Route::get('/reports', [BoardReportsController::class, 'index']);
    Route::put('/schools/{school}', [BoardSchoolController::class, 'update']);
    Route::get('/teachers', [BoardTeacherController::class, 'index']);
    Route::get('/teacher-requests', [BoardTeacherRequestController::class, 'index']);
    Route::patch('/teacher-requests/{teacher}/accept', [BoardTeacherRequestController::class, 'accept']);
    Route::patch('/teacher-requests/{teacher}/reject', [BoardTeacherRequestController::class, 'reject']);
    Route::get('/profile', [BoardProfileController::class, 'show']);
    Route::put('/profile', [BoardProfileController::class, 'update']);
    Route::get('/profile/avatar', [BoardProfileController::class, 'showAvatar']);
    Route::post('/profile/avatar', [BoardProfileController::class, 'uploadAvatar']);
    Route::get('/settings', [BoardSettingsController::class, 'show']);
    Route::put('/settings', [BoardSettingsController::class, 'update']);
    Route::get('/assessments', [BoardAssessmentController::class, 'index']);
    Route::get('/assessments/{assessment}', [BoardAssessmentController::class, 'show']);
    Route::put('/assessments/{assessment}', [BoardAssessmentController::class, 'update']);
    Route::patch('/assessments/{assessment}/activate', [BoardAssessmentController::class, 'activate']);
});
