import { BookOpen, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { LangToggle } from "./LangToggle";
import { useLanguage } from "../i18n";
import { teacherNavItems } from "../i18n/navHelpers";

type TeacherSidebarProps = {
  active: "classes" | "library" | "reports" | "profile";
  onLogout?: () => void;
};

export function TeacherSidebar({ active, onLogout }: TeacherSidebarProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const menuItems = teacherNavItems(t, active);

  return (
    <div
      className="w-64 p-6 flex flex-col overflow-y-auto"
      style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}
    >
      <div className="flex items-center gap-3 mb-12">
        <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
        <h1 className="text-xl" style={{ color: "#004aad" }}>
          {t("common.appName")}
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: item.active ? "#dff3ff" : "transparent",
                color: item.active ? "#004aad" : "#000000",
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <LangToggle />
      <button
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
