import { createBrowserRouter, Navigate, Outlet } from "react-router";
import type { ComponentType } from "react";
import { PageTitle } from "./components/PageTitle";
import { LoginPage } from "./pages/LoginPage";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { StudentTracking } from "./pages/StudentTracking";
import { SchoolBoardDashboard } from "./pages/SchoolBoardDashboard";
import { SchoolPortal } from "./pages/SchoolPortal";
import { ProfilePage } from "./pages/ProfilePage";
import { EvaluationDetailPage } from "./pages/EvaluationDetailPage";
import { LibraryPage } from "./pages/LibraryPage";
import { ContentViewerPage } from "./pages/ContentViewerPage";
import { ResourceDetailPage } from "./pages/ResourceDetailPage";
import { UnitLessonViewerPage } from "./pages/UnitLessonViewerPage";
import { ResourceCategoryPage } from "./pages/ResourceCategoryPage";
import { LessonsPage } from "./pages/LessonsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { BoardReportsPage } from "./pages/BoardReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SchoolReportsPage } from "./pages/SchoolReportsPage";
import { AcademicsPage } from "./pages/AcademicsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminSchoolBoardsPage } from "./pages/admin/AdminSchoolBoardsPage";
import { AdminSchoolsPage } from "./pages/admin/AdminSchoolsPage";
import { AdminTeachersPage } from "./pages/admin/AdminTeachersPage";
import { AdminStudentsPage } from "./pages/admin/AdminStudentsPage";
import { AdminContentPage } from "./pages/admin/AdminContentPage";
import { AdminWorkshopsPage } from "./pages/admin/AdminWorkshopsPage";
import { AdminTemplatesPage } from "./pages/admin/AdminTemplatesPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminDownloadableResourcesPage } from "./pages/admin/AdminDownloadableResourcesPage";
import { BoardAssessmentsPage } from "./pages/BoardAssessmentsPage";
import { BoardProfilePage } from "./pages/BoardProfilePage";
import { SchoolAssessmentsPage } from "./pages/SchoolAssessmentsPage";
import { TeacherAssessmentsPage } from "./pages/TeacherAssessmentsPage";
import { TeacherSignUpPage } from "./pages/TeacherSignUpPage";
import { SubscriptionPlanPage } from "./pages/SubscriptionPlanPage";
import { PaymentPage } from "./pages/PaymentPage";
import { TeacherSignInPage } from "./pages/TeacherSignInPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { TeacherRoute } from "./components/TeacherRoute";
import { AdminRoute } from "./components/AdminRoute";
import { BoardRoute } from "./components/BoardRoute";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";

function withTeacherRoute(Component: ComponentType) {
  return function ProtectedPage() {
    return (
      <TeacherRoute>
        <Component />
      </TeacherRoute>
    );
  };
}

function withAdminRoute(Component: ComponentType) {
  return function ProtectedPage() {
    return (
      <AdminRoute>
        <Component />
      </AdminRoute>
    );
  };
}

function withBoardRoute(Component: ComponentType) {
  return function ProtectedPage() {
    return (
      <BoardRoute>
        <Component />
      </BoardRoute>
    );
  };
}

function AppShell() {
  return (
    <>
      <PageTitle />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/signin",
    Component: TeacherSignInPage,
  },
  {
    path: "/signup",
    Component: TeacherSignUpPage,
  },
  {
    path: "/signup/plan",
    Component: SubscriptionPlanPage,
  },
  {
    path: "/signup/payment",
    Component: PaymentPage,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage,
  },
  {
    path: "/dashboard",
    Component: withTeacherRoute(TeacherDashboard),
  },
  {
    path: "/class/:classId",
    Component: withTeacherRoute(StudentTracking),
  },
  {
    path: "/school",
    Component: SchoolReportsPage,
  },
  {
    path: "/board",
    Component: withBoardRoute(SchoolBoardDashboard),
  },
  {
    path: "/profile",
    Component: ProfilePage,
  },
  {
    path: "/evaluation/:studentId/:evaluationNum",
    Component: EvaluationDetailPage,
  },
  {
    path: "/library",
    Component: LibraryPage,
  },
  {
    path: "/library/content/:contentId",
    Component: ContentViewerPage,
  },
  {
    path: "/resource/:resourceId",
    Component: ResourceDetailPage,
  },
  {
    path: "/resource/:resourceId/lesson/:lessonNum/interactive",
    Component: UnitLessonViewerPage,
  },
  {
    path: "/resource/:resourceId/lessons",
    Component: LessonsPage,
  },
  {
    path: "/resources/:category/:resource",
    Component: ResourceCategoryPage,
  },
  {
    path: "/reports",
    Component: ReportsPage,
  },
  {
    path: "/assessments",
    Component: withTeacherRoute(TeacherAssessmentsPage),
  },
  {
    path: "/student/:studentId",
    Component: StudentDetailPage,
  },
  {
    path: "/board/reports",
    Component: withBoardRoute(BoardReportsPage),
  },
  {
    path: "/board/assessments",
    Component: withBoardRoute(BoardAssessmentsPage),
  },
  {
    path: "/board/profile",
    Component: withBoardRoute(BoardProfilePage),
  },
  {
    path: "/board/settings",
    Component: withBoardRoute(SettingsPage),
  },
  {
    path: "/school/settings",
    Component: SettingsPage,
  },
  {
    path: "/school/reports",
    Component: SchoolReportsPage,
  },
  {
    path: "/school/academics",
    Component: AcademicsPage,
  },
  {
    path: "/school/assessments",
    Component: SchoolAssessmentsPage,
  },
  {
    path: "/admin/login",
    Component: AdminLoginPage,
  },
  {
    path: "/admin",
    Component: withAdminRoute(AdminDashboard),
  },
  {
    path: "/admin/school-boards",
    Component: withAdminRoute(AdminSchoolBoardsPage),
  },
  {
    path: "/admin/schools",
    Component: withAdminRoute(AdminSchoolsPage),
  },
  {
    path: "/admin/teachers",
    Component: withAdminRoute(AdminTeachersPage),
  },
  {
    path: "/admin/students",
    Component: withAdminRoute(AdminStudentsPage),
  },
  {
    path: "/admin/content",
    Component: withAdminRoute(AdminContentPage),
  },
  {
    path: "/admin/downloadable-resources",
    Component: withAdminRoute(AdminDownloadableResourcesPage),
  },
  {
    path: "/admin/downloadable-resources/:categoryId",
    Component: withAdminRoute(AdminDownloadableResourcesPage),
  },
  {
    path: "/admin/assessments",
    Component: () => <Navigate to="/admin/assessments/workshops" replace />,
  },
  {
    path: "/admin/assessments/workshops",
    Component: withAdminRoute(AdminWorkshopsPage),
  },
  {
    path: "/admin/assessments/templates",
    Component: withAdminRoute(AdminTemplatesPage),
  },
  {
    path: "/admin/audit",
    Component: withAdminRoute(AdminAuditPage),
  },
  {
    path: "/admin/settings",
    Component: withAdminRoute(AdminSettingsPage),
  },
    ],
  },
]);
