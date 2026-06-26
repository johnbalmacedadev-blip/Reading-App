import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, Building2, School, Users, GraduationCap,
  Library, ClipboardList, History, Settings, LogOut, BookOpen, ShieldCheck,
} from "lucide-react";
import { LangToggle } from "../../components/LangToggle";
import { useLanguage } from "../../i18n";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Building2, label: "School Boards", path: "/admin/school-boards" },
  { icon: School, label: "Schools", path: "/admin/schools" },
  { icon: Users, label: "Teachers", path: "/admin/teachers" },
  { icon: GraduationCap, label: "Student Records", path: "/admin/students" },
  { icon: Library, label: "Content Library", path: "/admin/content" },
  { icon: ClipboardList, label: "Assessments", path: "/admin/assessments" },
  { icon: History, label: "Audit Log", path: "/admin/audit" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 252,
        minHeight: "100vh",
        background: "#0a1628",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #004aad, #38b6ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BookOpen size={18} color="white" />
            </div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{t("common.appName")}</div>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(56,182,255,0.12)", borderRadius: 20,
            padding: "3px 10px",
          }}>
            <ShieldCheck size={11} color="#38b6ff" />
            <span style={{ color: "#38b6ff", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>ADMIN PORTAL</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 12px" }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: "none", cursor: "pointer", textAlign: "left",
                  marginBottom: 2,
                  background: active ? "rgba(56,182,255,0.15)" : "transparent",
                  color: active ? "#38b6ff" : "rgba(255,255,255,0.6)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  transition: "all 0.15s",
                  borderLeft: active ? "2px solid #38b6ff" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
                  }
                }}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ marginBottom: 8 }}>
            <LangToggle />
          </div>
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: "none", cursor: "pointer", background: "transparent",
              color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "left",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,82,82,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "#ff5757";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minHeight: "100vh", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}