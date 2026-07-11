import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Book,
  ClipboardList,
  Settings,
  User,
  Users,
} from "lucide-react";
import type { TranslationKey } from "../i18n";

type NavItem = {
  icon: LucideIcon;
  labelKey: TranslationKey;
  path: string;
  active: boolean;
};

export type TeacherNavActive = "classes" | "library" | "reports" | "assessments" | "profile";

export function teacherNavItems(
  t: (key: TranslationKey) => string,
  active: TeacherNavActive
): { icon: LucideIcon; label: string; active: boolean; path: string }[] {
  const items: NavItem[] = [
    { icon: Users, labelKey: "nav.myClasses", path: "/dashboard", active: active === "classes" },
    { icon: Book, labelKey: "nav.library", path: "/library", active: active === "library" },
    { icon: BarChart3, labelKey: "nav.reports", path: "/reports", active: active === "reports" },
    { icon: ClipboardList, labelKey: "nav.assessments", path: "/assessments", active: active === "assessments" },
    { icon: User, labelKey: "nav.profile", path: "/profile", active: active === "profile" },
  ];
  return items.map(({ icon, labelKey, path, active: isActive }) => ({
    icon,
    label: t(labelKey),
    path,
    active: isActive,
  }));
}

export type BoardNavActive = "overview" | "reports" | "assessments" | "profile" | "settings";

export function boardNavItems(
  t: (key: TranslationKey) => string,
  active: BoardNavActive
): { icon: LucideIcon; label: string; active: boolean; path: string }[] {
  const items: NavItem[] = [
    { icon: Users, labelKey: "common.overview", path: "/board", active: active === "overview" },
    { icon: BarChart3, labelKey: "nav.reports", path: "/board/reports", active: active === "reports" },
    { icon: ClipboardList, labelKey: "nav.assessments", path: "/board/assessments", active: active === "assessments" },
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
