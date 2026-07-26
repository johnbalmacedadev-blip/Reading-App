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
