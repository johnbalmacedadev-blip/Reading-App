import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, TrendingUp, Download, AlertTriangle,
  ArrowUpRight, Users, Building2, GraduationCap,
  User, Settings, ChevronDown, ClipboardList, Loader2, UserPlus,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";
import { useAuth } from "../context/AuthContext";
import { schoolReportsApi, type SchoolReportsData } from "../api/client";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getBarColor(pct: number) {
  if (pct >= 80) return "#c9e265";
  if (pct >= 65) return "#ffde59";
  return "#ff5757";
}

export function SchoolReportsPage() {
  const navigate = useNavigate();
  const { t, auto } = useLanguage();
  const { logout } = useAuth();
  const [reports, setReports] = useState<SchoolReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");
  const [viewMode, setViewMode] = useState<"class" | "grade">("class");

  const loadReports = useCallback(async (schoolYear?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await schoolReportsApi.get(schoolYear);
      setReports(data);
      if (!schoolYear && data.school_year) {
        setYear(data.school_year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    loadReports(newYear);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = [
    { icon: TrendingUp, label: "Overview", path: "/school/reports", active: true },
    { icon: GraduationCap, label: "Academics", path: "/school/academics", active: false },
    { icon: ClipboardList, label: "Assessments", path: "/school/assessments", active: false },
    { icon: UserPlus, label: t("nav.teacherRequests"), path: "/school/teachers", active: false },
    { icon: User, label: "Profile", path: "/profile?portal=school", active: false },
    { icon: Settings, label: "Settings", path: "/school/settings", active: false },
  ];

  const classes = reports?.classes ?? [];
  const schoolOnTrack = reports?.summary.on_track_average ?? 0;
  const totalStudents = reports?.summary.total_students ?? 0;
  const atRiskStudents = reports?.at_risk_students ?? [];
  const skillsData = reports?.skills ?? [];
  const schoolName = reports?.school.name ?? "";
  const schoolBoardName = reports?.school.school_board?.name ?? null;

  const gradeGroups = useMemo(() => {
    const grades = [...new Set(classes.map((c) => c.grade))];
    return grades.map((grade) => ({
      grade,
      classes: classes.filter((c) => c.grade === grade),
      avg: (() => {
        const group = classes.filter((c) => c.grade === grade);
        if (!group.length) return null;
        return Math.round(group.reduce((sum, c) => sum + c.on_track, 0) / group.length);
      })(),
    }));
  }, [classes]);

  const yearOptions = reports?.available_years.length
    ? reports.available_years
    : year
      ? [year]
      : ["2025-2026"];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#dff3ff" }}>
      <aside style={{ width: 220, background: "#ffffff", borderRight: "1px solid #dff3ff", display: "flex", flexDirection: "column", padding: "28px 16px 20px", flexShrink: 0 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <BookOpen size={24} style={{ color: "#004aad" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#004aad" }}>Lecture Scientifique</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#dff3ff", color: "#004aad" }}>
            School Portal
          </span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                background: item.active ? "#dff3ff" : "transparent",
                color: item.active ? "#004aad" : "#374151",
                fontWeight: item.active ? 600 : 400, fontSize: 14,
              }}>
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div>
          <LangToggle />
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "#ff5757", fontSize: 14, width: "100%" }}>
            <LogOut size={16} />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: schoolBoardName ? 2 : 4 }}>
              <Building2 size={15} style={{ color: "#38b6ff" }} />
              <span style={{ fontSize: 13, color: "#38b6ff", fontWeight: 500 }}>{schoolName || "—"}</span>
            </div>
            {schoolBoardName && (
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px 21px" }}>{auto(schoolBoardName)}</p>
            )}
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#004aad", margin: 0 }}>Reports and Analytics</h1>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 3 }}>Detailed view of school performance</p>
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={loading || yearOptions.length === 0}
              style={{ padding: "8px 32px 8px 14px", borderRadius: 10, border: "1px solid #dbeafe", background: "white", fontSize: 13, fontWeight: 500, color: "#004aad", outline: "none", cursor: "pointer", appearance: "none" }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#004aad", pointerEvents: "none" }} />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={() => loadReports(year || undefined)} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
              Retry
            </button>
          </div>
        )}

        {loading && !reports ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={20} className="animate-spin" />
            Loading reports…
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 24 }}>
              {[
                { label: "Enrolled students", value: totalStudents, icon: Users, iconBg: "#dff3ff", iconColor: "#004aad" },
                { label: "Classes", value: classes.length, icon: Building2, iconBg: "#e0f2fe", iconColor: "#0369a1" },
                { label: "On track average", value: `${schoolOnTrack}%`, icon: TrendingUp, iconBg: "#ecfdf5", iconColor: "#059669" },
              ].map((k) => (
                <div key={k.label} style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <k.icon size={18} style={{ color: k.iconColor }} />
                  </div>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px" }}>{k.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#004aad", margin: 0 }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#004aad", margin: 0 }}>Grade benchmarks</h2>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Download size={12} /> Export
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {(reports?.grade_benchmarks ?? []).map((row) => (
                    <div key={row.grade} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{row.grade}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: getBarColor(row.on_track) }}>
                          {row.on_track}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${row.on_track}%`, background: getBarColor(row.on_track), borderRadius: 3, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  ))}
                  {(reports?.grade_benchmarks ?? []).length === 0 && (
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No grade data for this school year.</p>
                  )}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#004aad", margin: "0 0 16px" }}>Skills Profile</h2>
                <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid #e5e7eb" }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151" }}>Skill</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 130 }}>Level (0–100)</span>
                </div>
                {skillsData.map((s) => (
                  <div key={s.num} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.num}</span>
                      </div>
                      <span style={{ fontSize: 13, color: "#1f2937" }}>{s.subject}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 130 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", width: 28, textAlign: "right" }}>{s.score}</span>
                      <div style={{ width: 80, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${s.score}%`, background: "#004aad", borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>School-wide average scores (0–100).</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "white", borderRadius: 12, padding: 4, width: "fit-content", border: "1px solid #e8f4ff" }}>
              {(["class", "grade"] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  style={{
                    padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                    background: viewMode === mode ? "#004aad" : "transparent",
                    color: viewMode === mode ? "white" : "#64748b",
                  }}>
                  View by {mode}
                </button>
              ))}
            </div>

            {viewMode === "class" && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                  {classes.map((cls) => {
                    const diff = cls.on_track - schoolOnTrack;
                    return (
                      <div key={cls.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.04)" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#004aad", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{initials(cls.teacher)}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "#004aad", margin: 0 }}>{cls.name}</p>
                              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{cls.teacher}</p>
                            </div>
                          </div>
                          <button onClick={() => navigate("/school/academics")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#38b6ff" }}>
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>Students: <strong style={{ color: "#1e293b" }}>{cls.students}</strong></span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: getBarColor(cls.on_track) }}>On track: {cls.on_track}%</span>
                        </div>
                        <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                          <div style={{ height: "100%", width: `${cls.on_track}%`, background: getBarColor(cls.on_track), borderRadius: 4 }} />
                        </div>
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                          {diff >= 0 ? "+" : ""}{diff}% vs avg.
                        </p>
                      </div>
                    );
                  })}
                  {classes.length === 0 && (
                    <div style={{ background: "white", borderRadius: 16, padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                      No classes found for this school year.
                    </div>
                  )}
                </div>

                {atRiskStudents.length > 0 && (
                  <div style={{ background: "#fff5f5", borderRadius: 16, padding: "20px 24px", border: "2px solid #fecaca" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <AlertTriangle size={16} style={{ color: "#ef4444" }} />
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", margin: 0 }}>
                        At risk ({atRiskStudents.length})
                      </h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {atRiskStudents.map((s) => (
                        <div key={s.id} style={{ background: "white", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #fee2e2" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#004aad", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{s.initials}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{s.class_name} • {s.teacher}</p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: "#ff5757", color: "white" }}>
                              At risk
                            </span>
                            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === "grade" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {gradeGroups.map(({ grade, classes: gc, avg }) => (
                  <div key={grade}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#004aad", margin: 0 }}>{grade}</h3>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                          {gc.length} class{gc.length !== 1 ? "es" : ""} • {gc.reduce((s, c) => s + c.students, 0)} students
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Average &quot;On track&quot;</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: avg !== null ? getBarColor(avg) : "#94a3b8", margin: 0 }}>
                          {avg !== null ? `${avg}%` : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                      {gc.map((cls) => (
                        <div key={cls.id} style={{ background: "white", borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${getBarColor(cls.on_track)}40`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#004aad", margin: "0 0 2px" }}>{cls.name}</p>
                          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>{cls.teacher}</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: getBarColor(cls.on_track), margin: 0 }}>{cls.on_track}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {gradeGroups.length === 0 && (
                  <div style={{ background: "white", borderRadius: 14, padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                    No grade data available.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
