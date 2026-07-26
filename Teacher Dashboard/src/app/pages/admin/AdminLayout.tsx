import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, Building2, School, Users, GraduationCap,
  Library, ClipboardList, History, Settings, LogOut, BookOpen, ShieldCheck,
  FileDown, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Database,
} from "lucide-react";
import { LangToggle } from "../../components/LangToggle";
import { useLanguage } from "../../i18n";
import { downloadableApi, type DownloadableCategoryItem } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useCollapsibleSidebar } from "../../hooks/useCollapsibleSidebar";
import { AdminSchoolYearSelector } from "../../components/admin/AdminSchoolYearSelector";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Building2, label: "School Boards", path: "/admin/school-boards" },
  { icon: School, label: "Schools", path: "/admin/schools" },
  { icon: GraduationCap, label: "Student Records", path: "/admin/students" },
  { icon: Library, label: "Content Library", path: "/admin/content" },
  { icon: History, label: "Audit Log", path: "/admin/audit" },
  { icon: Database, label: "Backup", path: "/admin/backup" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const teacherSubItems = [
  { label: "All Teachers", path: "/admin/teachers" },
  { label: "Classes", path: "/admin/teachers/classes" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const { collapsed, collapse, expand } = useCollapsibleSidebar("admin-sidebar-collapsed");
  const [categories, setCategories] = useState<DownloadableCategoryItem[]>([]);
  const [downloadableOpen, setDownloadableOpen] = useState(
    () => location.pathname.startsWith("/admin/downloadable-resources")
  );
  const [assessmentsOpen, setAssessmentsOpen] = useState(
    () => location.pathname.startsWith("/admin/assessments")
  );
  const [teachersOpen, setTeachersOpen] = useState(
    () => location.pathname.startsWith("/admin/teachers")
  );

  const assessmentSubItems = [
    { label: "Workshops", path: "/admin/assessments/workshops" },
    { label: "Templates", path: "/admin/assessments/templates" },
  ];

  useEffect(() => {
    downloadableApi.listCategories().then(({ categories: data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/downloadable-resources")) {
      setDownloadableOpen(true);
    }
    if (location.pathname.startsWith("/admin/assessments")) {
      setAssessmentsOpen(true);
    }
    if (location.pathname.startsWith("/admin/teachers")) {
      setTeachersOpen(true);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/admin/teachers") return location.pathname === "/admin/teachers";
    return location.pathname.startsWith(path);
  };

  const isDownloadableActive = location.pathname.startsWith("/admin/downloadable-resources");
  const isAssessmentsActive = location.pathname.startsWith("/admin/assessments");
  const isTeachersActive = location.pathname.startsWith("/admin/teachers");

  // First 3 items: Dashboard, School Boards, Schools — then Teachers submenu — then rest of top slice
  const topNavItems = navItems.slice(0, 3);
  const midNavItems = navItems.slice(3, 5); // Student Records, Content Library
  const bottomNavItems = navItems.slice(5);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter', sans-serif" }}>
      <aside style={{
        width: collapsed ? 0 : 252,
        minHeight: "100vh",
        background: "#0a1628",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        opacity: collapsed ? 0 : 1,
        transition: "width 0.3s ease, opacity 0.3s ease",
      }}
        aria-hidden={collapsed}
      >
        <div style={{ width: 252, height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #004aad, #38b6ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <BookOpen size={18} color="white" />
            </div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{t("common.appName")}</div>
            </div>
            <button
              type="button"
              onClick={collapse}
              title="Hide menu"
              aria-label="Hide menu"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              <PanelLeftClose size={18} color="rgba(255,255,255,0.55)" />
            </button>
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
          {topNavItems.map((item) => {
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

          {/* Teachers with sub-links */}
          <div style={{ marginBottom: 2 }}>
            <button
              onClick={() => {
                setTeachersOpen((o) => !o);
                if (!isTeachersActive) navigate("/admin/teachers");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "none", cursor: "pointer", textAlign: "left",
                background: isTeachersActive ? "rgba(56,182,255,0.15)" : "transparent",
                color: isTeachersActive ? "#38b6ff" : "rgba(255,255,255,0.6)",
                fontWeight: isTeachersActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                borderLeft: isTeachersActive ? "2px solid #38b6ff" : "2px solid transparent",
              }}
            >
              <Users size={16} />
              <span style={{ flex: 1 }}>Teachers</span>
              {teachersOpen
                ? <ChevronDown size={14} style={{ opacity: 0.6 }} />
                : <ChevronRight size={14} style={{ opacity: 0.6 }} />}
            </button>
            {teachersOpen && (
              <div style={{ marginLeft: 12, marginTop: 2, paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                {teacherSubItems.map((item) => {
                  const subActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 10px", borderRadius: 6,
                        border: "none", cursor: "pointer", textAlign: "left",
                        marginBottom: 1,
                        background: subActive ? "rgba(56,182,255,0.12)" : "transparent",
                        color: subActive ? "#38b6ff" : "rgba(255,255,255,0.5)",
                        fontWeight: subActive ? 600 : 400,
                        fontSize: 12,
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {midNavItems.map((item) => {
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

          {/* Downloadable Resources with sub-links */}
          <div style={{ marginBottom: 2 }}>
            <button
              onClick={() => {
                setDownloadableOpen((o) => !o);
                if (!isDownloadableActive) navigate("/admin/downloadable-resources");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "none", cursor: "pointer", textAlign: "left",
                background: isDownloadableActive ? "rgba(56,182,255,0.15)" : "transparent",
                color: isDownloadableActive ? "#38b6ff" : "rgba(255,255,255,0.6)",
                fontWeight: isDownloadableActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                borderLeft: isDownloadableActive ? "2px solid #38b6ff" : "2px solid transparent",
              }}
            >
              <FileDown size={16} />
              <span style={{ flex: 1 }}>Downloadable Resources</span>
              {downloadableOpen
                ? <ChevronDown size={14} style={{ opacity: 0.6 }} />
                : <ChevronRight size={14} style={{ opacity: 0.6 }} />}
            </button>
            {downloadableOpen && (
              <div style={{ marginLeft: 12, marginTop: 2, paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                {categories.map((cat) => {
                  const subActive = location.pathname === `/admin/downloadable-resources/${cat.id}`;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/admin/downloadable-resources/${cat.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 10px", borderRadius: 6,
                        border: "none", cursor: "pointer", textAlign: "left",
                        marginBottom: 1,
                        background: subActive ? "rgba(56,182,255,0.12)" : "transparent",
                        color: subActive ? "#38b6ff" : "rgba(255,255,255,0.5)",
                        fontWeight: subActive ? 600 : 400,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: cat.color, flexShrink: 0,
                        }}
                      />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cat.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessments with sub-links */}
          <div style={{ marginBottom: 2 }}>
            <button
              onClick={() => setAssessmentsOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "none", cursor: "pointer", textAlign: "left",
                background: isAssessmentsActive ? "rgba(56,182,255,0.15)" : "transparent",
                color: isAssessmentsActive ? "#38b6ff" : "rgba(255,255,255,0.6)",
                fontWeight: isAssessmentsActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                borderLeft: isAssessmentsActive ? "2px solid #38b6ff" : "2px solid transparent",
              }}
            >
              <ClipboardList size={16} />
              <span style={{ flex: 1 }}>Assessments</span>
              {assessmentsOpen
                ? <ChevronDown size={14} style={{ opacity: 0.6 }} />
                : <ChevronRight size={14} style={{ opacity: 0.6 }} />}
            </button>
            {assessmentsOpen && (
              <div style={{ marginLeft: 12, marginTop: 2, paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                {assessmentSubItems.map((item) => {
                  const subActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 10px", borderRadius: 6,
                        border: "none", cursor: "pointer", textAlign: "left",
                        marginBottom: 1,
                        background: subActive ? "rgba(56,182,255,0.12)" : "transparent",
                        color: subActive ? "#38b6ff" : "rgba(255,255,255,0.5)",
                        fontWeight: subActive ? 600 : 400,
                        fontSize: 12,
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {bottomNavItems.map((item) => {
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
            onClick={async () => {
              await logout();
              navigate("/admin/login");
            }}
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
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minHeight: "100vh", overflowY: "auto", position: "relative" }}>
        {collapsed && (
          <button
            type="button"
            onClick={expand}
            title="Show menu"
            aria-label="Show menu"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 20,
              padding: 10,
              borderRadius: 10,
              background: "#0a1628",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <PanelLeft size={18} color="#38b6ff" />
          </button>
        )}
        <div style={{ paddingTop: collapsed ? 56 : 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: collapsed ? "12px 36px 0" : "16px 36px 0",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#f0f4f8",
          }}>
            <AdminSchoolYearSelector />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
