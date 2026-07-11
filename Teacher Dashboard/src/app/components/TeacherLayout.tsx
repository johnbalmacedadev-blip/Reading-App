import { type ReactNode } from "react";
import { useNavigate } from "react-router";
import { BookOpen, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { LangToggle } from "./LangToggle";
import { useLanguage } from "../i18n";
import { teacherNavItems, type TeacherNavActive } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";
import { useCollapsibleSidebar } from "../hooks/useCollapsibleSidebar";

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
  const handleLogout = usePortalLogout();
  const { collapsed, collapse, expand } = useCollapsibleSidebar(STORAGE_KEY);
  const menuItems = teacherNavItems(t, activeNav);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
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
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-8 h-8 shrink-0" style={{ color: "#004aad" }} />
            <h1 className="text-xl truncate" style={{ color: "#004aad" }}>
              {t("common.appName")}
            </h1>
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

        <nav className="flex-1 space-y-2 min-w-[208px] overflow-y-auto">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer"
              style={{
                background: active ? "#dff3ff" : "transparent",
                color: active ? "#004aad" : "#000000",
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-[208px]">
          <LangToggle />
          <button
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
        <div className={`${contentClassName}${collapsed ? " pt-14" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
