import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, TrendingUp, GraduationCap, User, Settings,
  ClipboardList, Search, ChevronDown, Eye, Copy, CheckCircle2, Clock,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

const assessments = [
  { id: 1, title: "Atelier 2 — Conscience phonologique", unit: "Unité 1", atelier: 2, grade: "Maternelle", questions: 3, status: "Publié", assignedClasses: ["Maternelle A", "Maternelle B"] },
  { id: 2, title: "Atelier 6 — Lecture syllabique", unit: "Unité 1", atelier: 6, grade: "Jardin", questions: 2, status: "Publié", assignedClasses: ["Jardin A", "Jardin B"] },
  { id: 3, title: "Unité 2 — Décodage de base", unit: "Unité 2", atelier: 7, grade: "Jardin", questions: 3, status: "Publié", assignedClasses: ["Jardin A"] },
  { id: 4, title: "Atelier 10 — Fluidité", unit: "Unité 4", atelier: 10, grade: "1re année", questions: 2, status: "Brouillon", assignedClasses: [] },
  { id: 5, title: "Unité 6 — Compréhension de texte", unit: "Unité 6", atelier: 11, grade: "2e année", questions: 0, status: "Brouillon", assignedClasses: [] },
  { id: 6, title: "Atelier 14 — Stratégies avancées", unit: "Unité 7", atelier: 14, grade: "2e année", questions: 4, status: "Publié", assignedClasses: ["2e année A", "2e année B"] },
];

export function SchoolAssessmentsPage() {
  const navigate = useNavigate();
  const { t, auto, tp } = useLanguage();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("Tous les niveaux");
  const [statusFilter, setStatusFilter] = useState("Tous");

  const gradeOptions = [
    { value: "Tous les niveaux", label: t("assessments.allGrades") },
    { value: "Maternelle", label: t("grade.kindergarten") },
    { value: "Jardin", label: t("grade.garden") },
    { value: "1re année", label: t("grade.grade1") },
    { value: "2e année", label: t("grade.grade2") },
  ];

  const statusOptions = [
    { value: "Tous", label: auto("Tous") },
    { value: "Publié", label: t("assessments.publishedStatus") },
    { value: "Brouillon", label: t("assessments.draftStatus") },
  ];

  const gradeLabel = (grade: string) => {
    const map: Record<string, ReturnType<typeof t>> = {
      Maternelle: t("grade.kindergarten"),
      Jardin: t("grade.garden"),
      "1re année": t("grade.grade1"),
      "2e année": t("grade.grade2"),
    };
    return map[grade] ?? grade;
  };

  const navItems = [
    { icon: TrendingUp,    label: "Overview",     path: "/school/reports",      active: false },
    { icon: GraduationCap, label: "Academics",    path: "/school/academics",    active: false },
    { icon: ClipboardList, label: "Assessments",  path: "/school/assessments",  active: true },
    { icon: User,          label: "Profile",      path: "/profile?portal=school", active: false },
    { icon: Settings,      label: "Settings",     path: "/school/settings",     active: false },
  ];

  const filtered = assessments.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === "Tous les niveaux" || a.grade === gradeFilter;
    const matchStatus = statusFilter === "Tous" || a.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  const published = assessments.filter(a => a.status === "Publié").length;
  const drafts = assessments.filter(a => a.status === "Brouillon").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#dff3ff" }}>
      {/* Sidebar */}
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

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#004aad", margin: 0 }}>{t("assessments.title")}</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {t("assessments.subtitle")}
          </p>
        </div>

        {/* Admin access banner */}
        <div style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <CheckCircle2 size={15} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", margin: 0 }}>{t("assessments.accessEnabled")}</p>
            <p style={{ fontSize: 12, color: "#3b82f6", margin: "2px 0 0" }}>
              {auto("Votre école a accès à la consultation et à l'utilisation des évaluations. Géré depuis le portail administrateur.")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: t("assessments.total"), value: assessments.length, color: "#004aad", bg: "white" },
            { label: t("assessments.published"), value: published, color: "#059669", bg: "white", icon: CheckCircle2 },
            { label: t("assessments.drafts"), value: drafts, color: "#d97706", bg: "white", icon: Clock },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "18px 20px", border: "1px solid #dff3ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("assessments.searchPlaceholder")}
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #dff3ff", fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" }} />
          </div>
          {[
            { value: gradeFilter, onChange: setGradeFilter, options: gradeOptions },
            { value: statusFilter, onChange: setStatusFilter, options: statusOptions },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #dff3ff", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
                {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        {/* Assessment cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((a) => (
            <div key={a.id} style={{ background: "white", borderRadius: 14, padding: "18px 20px", border: "1px solid #dff3ff", boxShadow: "0 1px 3px rgba(0,74,173,0.05)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ background: "#dff3ff", borderRadius: 8, padding: 8 }}>
                  <ClipboardList size={16} color="#004aad" />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                  background: a.status === "Publié" ? "#ecfdf5" : "#fffbeb",
                  color: a.status === "Publié" ? "#059669" : "#d97706",
                }}>{a.status === "Publié" ? t("assessments.publishedStatus") : t("assessments.draftStatus")}</span>
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4, lineHeight: 1.4 }}>{auto(a.title)}</p>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                {auto(a.unit)} · {tp("evaluation.workshopN", { n: a.atelier })} · {gradeLabel(a.grade)}
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{auto(`${a.questions} question${a.questions !== 1 ? "s" : ""}`)}</span>
                <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 8 }}>
                  {a.assignedClasses.length > 0
                    ? auto(`${a.assignedClasses.length} classe${a.assignedClasses.length > 1 ? "s" : ""}`)
                    : t("assessments.notAssigned")}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Eye size={12} /> {t("assessments.view")}
                </button>
                <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Copy size={12} /> {t("assessments.use")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {t("assessments.noneFound")}
          </div>
        )}
      </main>
    </div>
  );
}
