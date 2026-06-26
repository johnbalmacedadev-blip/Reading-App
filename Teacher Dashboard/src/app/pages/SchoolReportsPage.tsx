import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, TrendingUp, Download, AlertTriangle,
  ArrowUpRight, Users, Building2, GraduationCap, BarChart3,
  User, Settings, ChevronDown, ClipboardList,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";

// ─── Data ──────────────────────────────────────────────────────────────────

const SCHOOL_NAME = "École Laurier-Trudeau";

const classes = [
  { id: 1, name: "Maternelle A", grade: "Maternelle", teacher: "Mme Martineau", students: 22, enVoie: 91 },
  { id: 2, name: "Maternelle B", grade: "Maternelle", teacher: "M. Gagnon", students: 21, enVoie: 86 },
  { id: 3, name: "Jardin A", grade: "Jardin", teacher: "M. Leblanc", students: 24, enVoie: 79 },
  { id: 4, name: "Jardin B", grade: "Jardin", teacher: "Mme Boucher", students: 23, enVoie: 74 },
  { id: 5, name: "1re année A", grade: "1re année", teacher: "Mme Pelletier", students: 25, enVoie: 72 },
  { id: 6, name: "1re année B", grade: "1re année", teacher: "M. Tremblay", students: 24, enVoie: 67 },
  { id: 7, name: "2e année A", grade: "2e année", teacher: "Mme Gagnon", students: 26, enVoie: 77 },
  { id: 8, name: "2e année B", grade: "2e année", teacher: "M. Richard", students: 25, enVoie: 68 },
];

const atRiskStudents = [
  { id: 5, name: "Emma Côté", className: "Maternelle B", teacher: "M. Gagnon", initials: "EC" },
  { id: 7, name: "Mathieu Lapointe", className: "Jardin A", teacher: "M. Leblanc", initials: "ML" },
  { id: 14, name: "Zoé Dupuis", className: "1re année B", teacher: "M. Tremblay", initials: "ZD" },
  { id: 20, name: "Camille Rousseau", className: "2e année B", teacher: "M. Richard", initials: "CR" },
];

const GRADES = ["Maternelle", "Jardin", "1re année", "2e année"];
const GRADE_EXPECTED: Record<string, number> = { "Maternelle": 2, "Jardin": 6, "1re année": 8, "2e année": 15 };

const gradeAvg = (grade: string) => {
  const gc = classes.filter(c => c.grade === grade);
  if (!gc.length) return null;
  return Math.round(gc.reduce((s, c) => s + c.enVoie, 0) / gc.length);
};

const schoolOnTrack = Math.round(classes.reduce((s, c) => s + c.enVoie, 0) / classes.length);
const totalStudents = classes.reduce((s, c) => s + c.students, 0);

const skillsData = [
  { subject: "Alphabetics\nKnowledge", score: 78, color: "#38b6ff", num: 1 },
  { subject: "Phonological\nAwareness", score: 72, color: "#c9e265", num: 2 },
  { subject: "Decoding", score: 65, color: "#38b6ff", num: 3 },
  { subject: "Fluency", score: 58, color: "#ffde59", num: 4 },
  { subject: "Comprehension", score: 55, color: "#ff5757", num: 5 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getBarColor(pct: number) {
  if (pct >= 80) return "#c9e265";
  if (pct >= 65) return "#ffde59";
  return "#ff5757";
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SchoolReportsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [year, setYear] = useState("2026-2027");
  const [viewMode, setViewMode] = useState<"class" | "grade">("class");

  const navItems = [
    { icon: TrendingUp,    label: "Overview",    path: "/school/reports",       active: true },
    { icon: GraduationCap, label: "Academics",   path: "/school/academics",     active: false },
    { icon: ClipboardList, label: "Assessments", path: "/school/assessments",   active: false },
    { icon: User,          label: "Profile",     path: "/profile?portal=school", active: false },
    { icon: Settings,      label: "Settings",    path: "/school/settings",      active: false },
  ];

  // Grade-level view: group classes by grade
  const gradeGroups = GRADES.map(grade => ({
    grade,
    classes: classes.filter(c => c.grade === grade),
    avg: gradeAvg(grade),
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#dff3ff" }}>
      {/* ── Sidebar ── */}
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
          <button onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "#ff5757", fontSize: 14, width: "100%" }}>
            <LogOut size={16} />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Building2 size={15} style={{ color: "#38b6ff" }} />
              <span style={{ fontSize: 13, color: "#38b6ff", fontWeight: 500 }}>{SCHOOL_NAME}</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#004aad", margin: 0 }}>Reports and Analytics</h1>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 3 }}>Detailed view of school performance</p>
          </div>
          <div style={{ position: "relative" }}>
            <select value={year} onChange={(e) => setYear(e.target.value)}
              style={{ padding: "8px 32px 8px 14px", borderRadius: 10, border: "1px solid #dbeafe", background: "white", fontSize: 13, fontWeight: 500, color: "#004aad", outline: "none", cursor: "pointer", appearance: "none" }}>
              <option>2026-2027</option>
              <option>2025-2026</option>
              <option>2024-2025</option>
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#004aad", pointerEvents: "none" }} />
          </div>
        </div>

        {/* KPI Cards */}
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

        {/* Grade benchmarks + Skills Profile */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>

          {/* Grade benchmarks */}
          <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#004aad", margin: 0 }}>Grade benchmarks</h2>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <Download size={12} /> Export
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[...GRADES, "3e année"].map((grade) => {
                const avg = gradeAvg(grade);
                return (
                  <div key={grade} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#374151" }}>{grade}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: avg !== null ? getBarColor(avg) : "#94a3b8" }}>
                        {avg !== null ? `${avg}%` : "N/A"}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      {avg !== null && (
                        <div style={{ height: "100%", width: `${avg}%`, background: getBarColor(avg), borderRadius: 3, transition: "width 0.4s" }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Profile */}
          <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid #e8f4ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#004aad", margin: "0 0 16px" }}>Skills Profile</h2>

            {/* Column headers */}
            <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151" }}>Skill</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 130 }}>Level (0–100)</span>
            </div>

            {/* Skill rows */}
            {skillsData.map((s) => (
              <div key={s.num} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.num}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#1f2937" }}>{s.subject.replace("\n", " ")}</span>
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

        {/* View toggle */}
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

        {/* View by class */}
        {viewMode === "class" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {classes.map((cls) => {
                const schoolAvg = schoolOnTrack;
                const diff = cls.enVoie - schoolAvg;
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
                      <button onClick={() => navigate(`/school/academics`)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#38b6ff" }}>
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "#6b7280" }}>Students: <strong style={{ color: "#1e293b" }}>{cls.students}</strong></span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: getBarColor(cls.enVoie) }}>On track: {cls.enVoie}%</span>
                    </div>
                    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", width: `${cls.enVoie}%`, background: getBarColor(cls.enVoie), borderRadius: 4 }} />
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      {diff >= 0 ? "+" : ""}{diff}% vs avg.
                    </p>
                  </div>
                );
              })}
            </div>

            {/* At risk section */}
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
                          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{s.className} • {s.teacher}</p>
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

        {/* View by grade */}
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
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Average "On track"</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: avg !== null ? getBarColor(avg) : "#94a3b8", margin: 0 }}>
                      {avg !== null ? `${avg}%` : "N/A"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {gc.map((cls) => (
                    <div key={cls.id} style={{ background: "white", borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${getBarColor(cls.enVoie)}40`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#004aad", margin: "0 0 2px" }}>{cls.name}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>{cls.teacher}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: getBarColor(cls.enVoie), margin: 0 }}>{cls.enVoie}%</p>
                    </div>
                  ))}
                  {gc.length === 0 && (
                    <div style={{ background: "white", borderRadius: 14, padding: "16px 18px", border: "1px solid #f1f5f9", color: "#94a3b8", fontSize: 13 }}>
                      No classes for this grade.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
