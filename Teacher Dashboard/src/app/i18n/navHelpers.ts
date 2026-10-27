import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Book,
  ClipboardList,
  CreditCard,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import type { TranslationKey } from "../i18n";

type NavItem = {
  icon: LucideIcon;
  labelKey: TranslationKey;
  path: string;
  active: boolean;
};

export type TeacherNavActive = "classes" | "library" | "reports" | "assessments" | "subscription" | "profile";

export function teacherNavItems(
  t: (key: TranslationKey) => string,
  active: TeacherNavActive,
  options?: { includeClasses?: boolean; includeAssessments?: boolean; includeReports?: boolean; includeSubscription?: boolean },
): { icon: LucideIcon; label: string; active: boolean; path: string }[] {
  const includeClasses = options?.includeClasses !== false;
  const includeAssessments = options?.includeAssessments !== false;
  const includeReports = options?.includeReports !== false;
  const includeSubscription = options?.includeSubscription !== false;
  const items: NavItem[] = [
    ...(includeClasses
      ? [{ icon: Users, labelKey: "nav.myClasses" as TranslationKey, path: "/dashboard", active: active === "classes" }]
      : []),
    { icon: Book, labelKey: "nav.library", path: "/library", active: active === "library" },
    ...(includeReports
      ? [{ icon: BarChart3, labelKey: "nav.reports" as TranslationKey, path: "/reports", active: active === "reports" }]
      : []),
    ...(includeAssessments
      ? [{ icon: ClipboardList, labelKey: "nav.assessments" as TranslationKey, path: "/assessments", active: active === "assessments" }]
      : []),
    ...(includeSubscription
      ? [{ icon: CreditCard, labelKey: "nav.subscription" as TranslationKey, path: "/subscription", active: active === "subscription" }]
      : []),
    { icon: User, labelKey: "nav.profile", path: "/profile", active: active === "profile" },
  ];
  return items.map(({ icon, labelKey, path, active: isActive }) => ({
    icon,
    label: t(labelKey),
    path,
    active: isActive,
  }));
}

export type BoardNavActive = "overview" | "reports" | "assessments" | "teachers" | "profile" | "settings" | "subscription";

export function boardNavItems(
  t: (key: TranslationKey) => string,
  active: BoardNavActive
): { icon: LucideIcon; label: string; active: boolean; path: string }[] {
  const items: NavItem[] = [
    { icon: Users, labelKey: "common.overview", path: "/board", active: active === "overview" },
    { icon: BarChart3, labelKey: "nav.reports", path: "/board/reports", active: active === "reports" },
    { icon: ClipboardList, labelKey: "nav.assessments", path: "/board/assessments", active: active === "assessments" },
    { icon: UserPlus, labelKey: "nav.teacherRequests", path: "/board/teachers", active: active === "teachers" },
    { icon: CreditCard, labelKey: "nav.subscription", path: "/board/subscription", active: active === "subscription" },
    { icon: User, labelKey: "nav.profile", path: "/board/profile", active: active === "profile" },
    { icon: Settings, labelKey: "nav.settings", path: "/board/settings", active: active === "settings" },
  ];
  return items.map(({ icon, labelKey, path, active: isActive }) => ({
    icon,
    label: t(labelKey),
    path,
    active: isActive,
  }));
}

export type SchoolNavActive = "overview" | "academics" | "assessments" | "teachers" | "subscription" | "profile" | "settings";

export function schoolNavItems(active: SchoolNavActive, teacherRequestsLabel = "Teacher requests") {
  return [
    { icon: BarChart3, label: "Overview", path: "/school/reports", active: active === "overview" },
    { icon: Book, label: "Academics", path: "/school/academics", active: active === "academics" },
    { icon: ClipboardList, label: "Assessments", path: "/school/assessments", active: active === "assessments" },
    { icon: UserPlus, label: teacherRequestsLabel, path: "/school/teachers", active: active === "teachers" },
    { icon: CreditCard, label: "Subscription", path: "/school/subscription", active: active === "subscription" },
    { icon: User, label: "Profile", path: "/school/profile", active: active === "profile" },
    { icon: Settings, label: "Settings", path: "/school/settings", active: active === "settings" },
  ];
}
