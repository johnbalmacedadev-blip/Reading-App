import { useNavigate } from "react-router";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LogOut,
  Settings,
  TrendingUp,
  User,
  UserPlus,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { TeacherRequestsPanel } from "../components/TeacherRequestsPanel";
import { useLanguage } from "../i18n";
import { usePortalLogout } from "../hooks/usePortalLogout";

export function SchoolTeacherRequestsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleLogout = usePortalLogout();

  const navItems = [
    { icon: TrendingUp, label: "Overview", path: "/school/reports", active: false },
    { icon: GraduationCap, label: "Academics", path: "/school/academics", active: false },
    { icon: ClipboardList, label: "Assessments", path: "/school/assessments", active: false },
    { icon: UserPlus, label: t("nav.teacherRequests"), path: "/school/teachers", active: true },
    { icon: User, label: "Profile", path: "/profile?portal=school", active: false },
    { icon: Settings, label: "Settings", path: "/school/settings", active: false },
  ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      <aside className="w-64 p-6 flex flex-col" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-10">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            <p className="text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>
              School Portal
            </p>
          </div>
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
