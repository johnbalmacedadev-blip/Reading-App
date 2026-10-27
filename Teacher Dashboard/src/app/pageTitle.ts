import type { TranslationKey } from "./i18n";

type PageTitleParts = {
  portalKey?: TranslationKey;
  pageKey: TranslationKey;
};

const matchers: Array<{ test: (path: string) => boolean; parts: PageTitleParts }> = [
  // Admin
  { test: (p) => p === "/admin/login", parts: { portalKey: "pageTitle.adminPortal", pageKey: "login.loginTitle" } },
  { test: (p) => p.startsWith("/admin/assessments/templates"), parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.templates" } },
  { test: (p) => p.startsWith("/admin/assessments/workshops"), parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.workshops" } },
  { test: (p) => p.startsWith("/admin/downloadable-resources"), parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.downloadableResources" } },
  { test: (p) => p === "/admin/audit", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.auditLog" } },
  { test: (p) => p === "/admin/settings", parts: { portalKey: "pageTitle.adminPortal", pageKey: "nav.settings" } },
  { test: (p) => p === "/admin/content", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.contentLibrary" } },
  { test: (p) => p === "/admin/students", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.studentRecords" } },
  { test: (p) => p === "/admin/teachers/classes", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.classes" } },
  { test: (p) => p === "/admin/teachers", parts: { portalKey: "pageTitle.adminPortal", pageKey: "common.teachers" } },
  { test: (p) => p === "/admin/schools", parts: { portalKey: "pageTitle.adminPortal", pageKey: "common.schools" } },
  { test: (p) => p === "/admin/school-boards", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.schoolBoards" } },
  { test: (p) => p === "/admin", parts: { portalKey: "pageTitle.adminPortal", pageKey: "pageTitle.dashboard" } },

  // Board
  { test: (p) => p === "/board/settings", parts: { portalKey: "login.boardPortal", pageKey: "nav.settings" } },
  { test: (p) => p === "/board/profile", parts: { portalKey: "login.boardPortal", pageKey: "common.profile" } },
  { test: (p) => p === "/board/assessments", parts: { portalKey: "login.boardPortal", pageKey: "nav.assessments" } },
  { test: (p) => p === "/board/reports", parts: { portalKey: "login.boardPortal", pageKey: "nav.reports" } },
  { test: (p) => p === "/board", parts: { portalKey: "login.boardPortal", pageKey: "pageTitle.dashboard" } },

  // School
  { test: (p) => p === "/school/settings", parts: { portalKey: "login.schoolPortal", pageKey: "nav.settings" } },
  { test: (p) => p === "/school/profile", parts: { portalKey: "login.schoolPortal", pageKey: "common.profile" } },
  { test: (p) => p === "/school/subscription", parts: { portalKey: "login.schoolPortal", pageKey: "nav.subscription" } },
  { test: (p) => p === "/school/assessments", parts: { portalKey: "login.schoolPortal", pageKey: "nav.assessments" } },
  { test: (p) => p === "/school/academics", parts: { portalKey: "login.schoolPortal", pageKey: "pageTitle.academics" } },
  { test: (p) => p === "/school/reports" || p === "/school", parts: { portalKey: "login.schoolPortal", pageKey: "nav.reports" } },

  // Teacher
  { test: (p) => p === "/account-status", parts: { portalKey: "login.teacherPortal", pageKey: "account.deactivated.badge" } },
  { test: (p) => p === "/subscription", parts: { portalKey: "login.teacherPortal", pageKey: "nav.subscription" } },
  { test: (p) => p === "/assessments", parts: { portalKey: "login.teacherPortal", pageKey: "nav.assessments" } },
  { test: (p) => p === "/reports", parts: { portalKey: "login.teacherPortal", pageKey: "nav.reports" } },
  { test: (p) => p.startsWith("/library/content/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.content" } },
  { test: (p) => p === "/library", parts: { portalKey: "login.teacherPortal", pageKey: "nav.library" } },
  { test: (p) => /\/resource\/[^/]+\/lesson\/[^/]+\/interactive$/.test(p), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.interactiveLesson" } },
  { test: (p) => /\/resource\/[^/]+\/lessons$/.test(p), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.lessons" } },
  { test: (p) => p.startsWith("/resource/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.resource" } },
  { test: (p) => p.startsWith("/resources/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.resources" } },
  { test: (p) => p.startsWith("/evaluation/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.evaluation" } },
  { test: (p) => p.startsWith("/student/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.student" } },
  { test: (p) => p.startsWith("/class/"), parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.class" } },
  { test: (p) => p === "/profile", parts: { portalKey: "login.teacherPortal", pageKey: "nav.profile" } },
  { test: (p) => p === "/dashboard", parts: { portalKey: "login.teacherPortal", pageKey: "pageTitle.dashboard" } },

  // Auth / onboarding
  { test: (p) => p === "/reset-password", parts: { pageKey: "reset.title" } },
  { test: (p) => p === "/forgot-password", parts: { pageKey: "login.forgotPassword" } },
  { test: (p) => p === "/signup/payment", parts: { pageKey: "pageTitle.payment" } },
  { test: (p) => p === "/signup/plan", parts: { pageKey: "pageTitle.subscriptionPlan" } },
  { test: (p) => p === "/signup", parts: { pageKey: "pageTitle.signUp" } },
  { test: (p) => p === "/signin", parts: { portalKey: "login.teacherPortal", pageKey: "login.signIn" } },
  { test: (p) => p === "/", parts: { pageKey: "login.welcome" } },
];

export function resolvePageTitleParts(pathname: string): PageTitleParts {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const match = matchers.find((entry) => entry.test(path));
  return match?.parts ?? { pageKey: "pageTitle.dashboard" };
}

export function formatDocumentTitle(
  parts: PageTitleParts,
  t: (key: TranslationKey) => string,
  appName: string,
): string {
  const page = t(parts.pageKey);
  if (!parts.portalKey) {
    return `${appName} - ${page}`;
  }
  return `${appName} - ${t(parts.portalKey)}, ${page}`;
}
