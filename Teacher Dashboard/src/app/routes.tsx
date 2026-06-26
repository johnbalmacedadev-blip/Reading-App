import { createBrowserRouter } from "react-router";
import type { ComponentType } from "react";
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
import { AtelierManagementPage } from "./pages/AtelierManagementPage";
import { AtelierEditPage } from "./pages/AtelierEditPage";
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
import { AdminAssessmentsPage } from "./pages/admin/AdminAssessmentsPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { BoardAssessmentsPage } from "./pages/BoardAssessmentsPage";
import { SchoolAssessmentsPage } from "./pages/SchoolAssessmentsPage";
import { TeacherSignUpPage } from "./pages/TeacherSignUpPage";
import { SubscriptionPlanPage } from "./pages/SubscriptionPlanPage";
import { PaymentPage } from "./pages/PaymentPage";
import { TeacherSignInPage } from "./pages/TeacherSignInPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { TeacherRoute } from "./components/TeacherRoute";

function withTeacherRoute(Component: ComponentType) {
  return function ProtectedPage() {
    return (
      <TeacherRoute>
        <Component />
      </TeacherRoute>
    );
  };
}

export const router = createBrowserRouter([
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
    Component: BoardReportsPage,
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
    path: "/student/:studentId",
    Component: StudentDetailPage,
  },
  {
    path: "/board/ateliers",
    Component: AtelierManagementPage,
  },
  {
    path: "/board/atelier/:atelierNum",
    Component: AtelierEditPage,
  },
  {
    path: "/board/reports",
    Component: BoardReportsPage,
  },
  {
    path: "/board/assessments",
    Component: BoardAssessmentsPage,
  },
  {
    path: "/board/settings",
    Component: SettingsPage,
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
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/admin/school-boards",
    Component: AdminSchoolBoardsPage,
  },
  {
    path: "/admin/schools",
    Component: AdminSchoolsPage,
  },
  {
    path: "/admin/teachers",
    Component: AdminTeachersPage,
  },
  {
    path: "/admin/students",
    Component: AdminStudentsPage,
  },
  {
    path: "/admin/content",
    Component: AdminContentPage,
  },
  {
    path: "/admin/assessments",
    Component: AdminAssessmentsPage,
  },
  {
    path: "/admin/audit",
    Component: AdminAuditPage,
  },
  {
    path: "/admin/settings",
    Component: AdminSettingsPage,
  },
]);
