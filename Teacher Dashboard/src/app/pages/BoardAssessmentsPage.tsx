import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, ClipboardList,
  Search, ChevronDown, Eye, CheckCircle2, Clock, Copy,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { boardNavItems } from "../i18n/navHelpers";

const assessments = [
  { id: 1, title: "Atelier 2 — Conscience phonologique", unit: "Unité 1", atelier: 2, grade: "Maternelle", questions: 3, status: "published" as const, assignedTo: "allSchools" as const },
  { id: 2, title: "Atelier 6 — Lecture syllabique", unit: "Unité 1", atelier: 6, grade: "Jardin", questions: 2, status: "published" as const, assignedTo: "allSchools" as const },
  { id: 3, title: "Unité 2 — Décodage de base", unit: "Unité 2", atelier: 7, grade: "Jardin", questions: 3, status: "published" as const, assignedTo: "allSchools" as const },
  { id: 4, title: "Atelier 10 — Fluidité", unit: "Unité 4", atelier: 10, grade: "1re année", questions: 2, status: "draft" as const, assignedTo: "selected" as const },
  { id: 5, title: "Unité 6 — Compréhension", unit: "Unité 6", atelier: 11, grade: "2e année", questions: 0, status: "draft" as const, assignedTo: "notAssigned" as const },
  { id: 6, title: "Atelier 14 — Stratégies avancées", unit: "Unité 7", atelier: 14, grade: "2e année", questions: 4, status: "published" as const, assignedTo: "allSchools" as const },
];

const GRADE_FILTER_OPTIONS = [
  { value: "all", dataGrade: null, labelKey: "assessments.allGrades" as const },
  { value: "kindergarten", dataGrade: "Maternelle", labelKey: "grade.kindergarten" as const },
  { value: "garden", dataGrade: "Jardin", labelKey: "grade.garden" as const },
  { value: "grade1", dataGrade: "1re année", labelKey: "grade.grade1" as const },
  { value: "grade2", dataGrade: "2e année", labelKey: "grade.grade2" as const },
];

export function BoardAssessmentsPage() {
  const navigate = useNavigate();
  const { t, tp, auto: a } = useLanguage();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const menuItems = boardNavItems(t, "assessments");

  const selectedGrade = GRADE_FILTER_OPTIONS.find((o) => o.value === gradeFilter)?.dataGrade ?? null;

  const filtered = assessments.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !selectedGrade || item.grade === selectedGrade;
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  const published = assessments.filter((item) => item.status === "published").length;
  const drafts = assessments.filter((item) => item.status === "draft").length;

  const assignedLabel = (key: (typeof assessments)[number]["assignedTo"]) => {
    if (key === "allSchools") return t("assessments.allSchools");
    if (key === "selected") return t("assessments.selected");
    return t("assessments.notAssigned");
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#fff0f0" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #ffe0e0" }}>
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-base font-bold" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5" style={{ background: "#fff0f0", color: "#004aad", fontWeight: 600 }}>
              {t("board.portal")}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 mt-6">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm"
              style={{ background: active ? "#fff0f0" : "transparent", color: active ? "#004aad" : "#444", fontWeight: active ? 600 : 400 }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <LangToggle />
        <button onClick={() => navigate("/")} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm mt-1" style={{ color: "#ff5757" }}>
          <LogOut className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{t("assessments.title")}</h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            {a("Consultez et gérez les évaluations partagées avec vos écoles.")}
          </p>
        </div>

        {/* Info banner — admin-controlled */}
        <div className="rounded-xl p-4 mb-8 flex items-start gap-3" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <CheckCircle2 size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1e40af" }}>{t("assessments.accessEnabled")}</p>
            <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>
              {a("Votre commission scolaire a accès à la visualisation et à la modification des évaluations. Cet accès peut être géré par l'administrateur de la plateforme.")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: t("assessments.total"), value: assessments.length, color: "#004aad", bg: "#dff3ff" },
            { label: t("assessments.published"), value: published, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
            { label: t("assessments.drafts"), value: drafts, color: "#d97706", bg: "#fffbeb", icon: Clock },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #ffe0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("assessments.searchPlaceholder")}
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #ffe0e0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
              style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #ffe0e0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
              {GRADE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
            <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #ffe0e0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
              <option value="all">{a("Tous")}</option>
              <option value="published">{t("assessments.publishedStatus")}</option>
              <option value="draft">{t("assessments.draftStatus")}</option>
            </select>
            <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
        </div>

        {/* Assessment cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #ffe0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg p-2" style={{ background: "#dff3ff" }}>
                  <ClipboardList size={16} style={{ color: "#004aad" }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                  background: item.status === "published" ? "#ecfdf5" : "#fffbeb",
                  color: item.status === "published" ? "#059669" : "#d97706",
                }}>
                  {item.status === "published" ? t("assessments.publishedStatus") : t("assessments.draftStatus")}
                </span>
              </div>

              <p className="font-semibold text-sm mb-1" style={{ color: "#1e293b", lineHeight: 1.4 }}>{a(item.title)}</p>
              <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
                {a(item.unit)} · {tp("evaluation.workshopN", { n: item.atelier })} · {a(item.grade)}
              </p>

              <div className="flex items-center justify-between text-xs mb-4" style={{ color: "#94a3b8" }}>
                <span>
                  {item.questions} {item.questions === 1 ? a("question") : a("questions")}
                </span>
                <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 8, color: "#64748b" }}>
                  {assignedLabel(item.assignedTo)}
                </span>
              </div>

              <div className="flex gap-2">
                <button style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Eye size={12} /> {t("assessments.view")}
                </button>
                <button style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Copy size={12} /> {t("assessments.use")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: "#94a3b8" }}>{t("assessments.noneFound")}</div>
        )}
      </div>
    </div>
  );
}
