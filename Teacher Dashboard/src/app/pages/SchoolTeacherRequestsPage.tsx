import { useNavigate } from "react-router";
import {
  ClipboardList,
  GraduationCap,
  LogOut,
  Settings,
  TrendingUp,
  User,
  UserPlus,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { LangToggle } from "../components/LangToggle";
import { TeacherRequestsPanel } from "../components/TeacherRequestsPanel";
import { useLanguage } from "../i18n";
import { schoolNavItems } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";

export function SchoolTeacherRequestsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleLogout = usePortalLogout();

  const navItems = schoolNavItems("teachers", t("nav.teacherRequests"));

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      <aside className="w-64 p-6 flex flex-col" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="mb-10 min-w-0">
          <BrandMark height={34} />
          <p className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>
            School Portal
          </p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ icon: Icon, label, path, active }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: active ? "#dff3ff" : "transparent", color: active ? "#004aad" : "#444", fontWeight: active ? 600 : 400 }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t space-y-3" style={{ borderColor: "#dff3ff" }}>
          <LangToggle />
          <button type="button" onClick={() => void handleLogout()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ color: "#ff5757" }}>
            <LogOut className="w-5 h-5" />
            {t("common.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <TeacherRequestsPanel portal="school" />
      </main>
    </div>
  );
}
