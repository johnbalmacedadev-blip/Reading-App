import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { LangToggle } from "./LangToggle";
import { BrandMark } from "./BrandMark";
import { useLanguage } from "../i18n";
import { teacherNavItems } from "../i18n/navHelpers";
import { useAuth } from "../context/AuthContext";
import {
  teacherCanAccessAssessments,
  teacherCanAccessClassroom,
  teacherIsAccountDeactivated,
  teacherIsInstitutional,
} from "../utils/teacherAccess";

type TeacherSidebarProps = {
  active: "classes" | "library" | "reports" | "profile";
  onLogout?: () => void;
};

export function TeacherSidebar({ active, onLogout }: TeacherSidebarProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const deactivated = teacherIsAccountDeactivated(user);
  const menuItems = teacherNavItems(t, active, {
    includeClasses: deactivated || teacherCanAccessClassroom(user),
    includeAssessments: !deactivated && teacherCanAccessAssessments(user),
    includeReports: deactivated || Boolean(user?.subscription?.can_access_reports),
    includeSubscription: !deactivated && !teacherIsInstitutional(user),
  });

  return (
    <div
      className="w-64 p-6 flex flex-col overflow-y-auto"
      style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}
    >
      <div className="mb-12 min-w-0">
        <BrandMark height={36} />
      </div>

      {deactivated && (
        <div
          className="mb-4 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}
        >
          {t("account.deactivated.badge")}
        </div>
      )}

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              disabled={deactivated}
              onClick={() => {
                if (!deactivated) navigate(item.path);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: item.active && !deactivated ? "#dff3ff" : "transparent",
                color: deactivated ? "#94a3b8" : item.active ? "#004aad" : "#000000",
                cursor: deactivated ? "not-allowed" : "pointer",
                opacity: deactivated ? 0.55 : 1,
              }}
              aria-disabled={deactivated}
              title={deactivated ? t("account.deactivated.menuLocked") : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <LangToggle />
      <button
        type="button"
        onClick={onLogout ?? (() => navigate("/"))}
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
        style={{ color: "#ff5757" }}
      >
        <LogOut className="w-5 h-5" />
        <span>{t("common.logout")}</span>
      </button>
    </div>
  );
}
