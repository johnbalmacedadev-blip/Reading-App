import { type ReactNode } from "react";
import { useNavigate } from "react-router";
import { LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { LangToggle } from "./LangToggle";
import { BrandMark } from "./BrandMark";
import { useLanguage } from "../i18n";
import { teacherNavItems, type TeacherNavActive } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";
import { useCollapsibleSidebar } from "../hooks/useCollapsibleSidebar";
import { useAuth } from "../context/AuthContext";
import {
  teacherCanAccessAssessments,
  teacherCanAccessClassroom,
  teacherIsAccountDeactivated,
  teacherIsInstitutional,
} from "../utils/teacherAccess";
import { TeacherTrialBanner } from "./TeacherTrialBanner";
import { TeacherLoginAlertModal } from "./TeacherLoginAlertModal";

const STORAGE_KEY = "teacher-sidebar-collapsed";

export function TeacherLayout({
  activeNav,
  children,
  contentClassName = "flex-1 overflow-y-auto",
}: {
  activeNav: TeacherNavActive;
  children: ReactNode;
  contentClassName?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const handleLogout = usePortalLogout();
  const { collapsed, collapse, expand } = useCollapsibleSidebar(STORAGE_KEY);
  const deactivated = teacherIsAccountDeactivated(user);
  const menuItems = teacherNavItems(t, activeNav, {
    includeClasses: deactivated || teacherCanAccessClassroom(user),
    includeAssessments: !deactivated && teacherCanAccessAssessments(user),
    includeReports: deactivated || Boolean(user?.subscription?.can_access_reports),
    includeSubscription: !deactivated && !teacherIsInstitutional(user),
  });

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      <TeacherLoginAlertModal />
      <aside
        className="flex flex-col overflow-hidden shrink-0 transition-[width,padding,opacity] duration-300 ease-in-out"
        style={{
          width: collapsed ? 0 : 256,
          background: "#ffffff",
          borderRight: collapsed ? "none" : "1px solid #dff3ff",
          padding: collapsed ? 0 : 24,
          opacity: collapsed ? 0 : 1,
        }}
        aria-hidden={collapsed}
      >
        <div className="flex items-center justify-between gap-2 mb-12 min-w-[208px]">
          <div className="min-w-0 flex-1">
            <BrandMark height={36} />
          </div>
          <button
            type="button"
            onClick={collapse}
            title="Hide menu"
            aria-label="Hide menu"
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
          >
            <PanelLeftClose className="w-5 h-5" style={{ color: "#64748b" }} />
          </button>
        </div>

        {deactivated && (
          <div
            className="min-w-[208px] mb-4 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}
          >
            {t("account.deactivated.badge")}
          </div>
        )}

        {!deactivated && (
          <div className="min-w-[208px] mb-4">
            <TeacherTrialBanner compact />
          </div>
        )}

        <nav className="flex-1 space-y-2 min-w-[208px] overflow-y-auto">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button
              key={path}
              type="button"
              disabled={deactivated}
              onClick={() => {
                if (!deactivated) navigate(path);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: active && !deactivated ? "#dff3ff" : "transparent",
                color: deactivated ? "#94a3b8" : active ? "#004aad" : "#000000",
                cursor: deactivated ? "not-allowed" : "pointer",
                opacity: deactivated ? 0.55 : 1,
              }}
              aria-disabled={deactivated}
              title={deactivated ? t("account.deactivated.menuLocked") : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-[208px]">
          <LangToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer w-full"
            style={{ color: "#ff5757" }}
          >
            <LogOut className="w-5 h-5" />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {collapsed && (
          <button
            type="button"
            onClick={expand}
            title="Show menu"
            aria-label="Show menu"
            className="absolute top-4 left-4 z-20 p-2.5 rounded-xl shadow-sm transition-colors hover:bg-slate-50"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <PanelLeft className="w-5 h-5" style={{ color: "#004aad" }} />
          </button>
        )}
        <div className={`${contentClassName}${collapsed ? " pt-14" : ""}`}>
          {!deactivated && collapsed && (
            <div className="px-4 pb-3">
              <TeacherTrialBanner />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
