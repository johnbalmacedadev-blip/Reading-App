import type { AuthUser } from "../api/client";

/** School/board join teachers waiting for approval can sign in but features are locked. */
export function teacherIsAccountDeactivated(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.role === "teacher" && user.account_status === "pending");
}

/** Independent teachers (no school and no school board) can manage Assessments. */
export function teacherIsInstitutional(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== "teacher" || teacherIsAccountDeactivated(user)) {
    return false;
  }

  if (user.subscription?.is_institutional || user.subscription?.is_registration_licensed) {
    return true;
  }

  const hasSchool = Boolean(user.school?.id);
  const hasBoard = Boolean(user.school_board && String(user.school_board).trim());

  return hasSchool || hasBoard;
}

export function teacherCanAccessAssessments(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== "teacher" || teacherIsAccountDeactivated(user)) {
    return false;
  }

  return Boolean(user.subscription?.can_access_classroom) && !teacherIsInstitutional(user);
}

export function teacherCanAccessClassroom(user: AuthUser | null | undefined): boolean {
  if (teacherIsAccountDeactivated(user)) {
    return false;
  }

  return Boolean(user?.role === "teacher" && user.subscription?.can_access_classroom);
}

export function teacherHomePath(user: AuthUser | null | undefined): string {
  if (teacherIsAccountDeactivated(user)) {
    return "/account-status";
  }

  return user?.subscription?.can_access_classroom ? "/dashboard" : "/library";
}

export function userMayAccessResource(
  user: AuthUser | null | undefined,
  kind: "downloadable" | "export",
  key: string | number,
): boolean {
  if (!user || user.role === "admin") {
    return true;
  }
  if (user.permissions?.trial_can_download_export) {
    return true;
  }
  if (!user.is_trial_only) {
    return true;
  }
  const access = user.resource_access;
  if (!access?.enabled) {
    return false;
  }
  if (kind === "downloadable") {
    return (access.downloadable_ids ?? []).includes(Number(key));
  }
  return (access.export_keys ?? []).includes(String(key));
}

const WALKTHROUGH_URL =
  "https://calendly.com/admin-apprendrefrancofun/free-15-minute-lecture-scientifique-demo?month=2026-09";

const PAID_WALKTHROUGH_DAYS = 14;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

/** Trial: always. Paid individual: first 14 days after account activation. */
export function teacherShouldShowWalkthroughPromo(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== "teacher" || teacherIsAccountDeactivated(user)) {
    return false;
  }

  const sub = user.subscription;
  if (!sub) return false;

  if (sub.is_trial_active || user.is_trial_only) {
    return true;
  }

  if (sub.is_active && !teacherIsInstitutional(user)) {
    const age = daysSince(user.account_activated_at ?? sub.subscription_started_at);
    return age !== null && age >= 0 && age < PAID_WALKTHROUGH_DAYS;
  }

  return false;
}

export function teacherWalkthroughUrl(): string {
  return WALKTHROUGH_URL;
}
