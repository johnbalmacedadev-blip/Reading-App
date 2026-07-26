import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, TrendingUp, GraduationCap, User, Settings,
  ClipboardList, Search, ChevronDown, Eye, Edit2, CheckCircle2, Loader2, X, CheckSquare, Archive, RotateCcw, UserPlus,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { usePortalLogout } from "../hooks/usePortalLogout";
import { AssessmentEditModal, type AssessmentEditData } from "../components/AssessmentEditModal";
import {
  schoolAssessmentsApi,
  type SchoolAssessmentDetail,
  type SchoolAssessmentPayload,
  type SchoolAssessmentRecord,
} from "../api/client";
import { getWorkshopTemplate, type TemplateDraft, type WorkshopTemplateId } from "../evaluation/workshopTemplates";
import { WorkshopTemplatePreview } from "../components/WorkshopTemplatePreview";

const GRADE_FILTER_OPTIONS = [
  { value: "all", labelKey: "assessments.allGrades" as const },
  { value: "kindergarten", labelKey: "grade.kindergarten" as const },
  { value: "garden", labelKey: "grade.garden" as const },
  { value: "grade1", labelKey: "grade.grade1" as const },
  { value: "grade2", labelKey: "grade.grade2" as const },
  { value: "grade3", labelKey: "grade.grade3" as const },
  { value: "grade3plus", label: "Grade 3+" },
];

function templateLabel(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  return `Template · ${templateId.replace("format_", "Format ")}`;
}

function AssessmentViewModal({
  assessment,
  loading,
  error,
  onClose,
  assignedLabel,
  t,
  tp,
  a,
}: {
  assessment: SchoolAssessmentDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  assignedLabel: (key: SchoolAssessmentRecord["assigned_to"]) => string;
  t: ReturnType<typeof useLanguage>["t"];
  tp: ReturnType<typeof useLanguage>["tp"];
  a: ReturnType<typeof useLanguage>["auto"];
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: assessment?.template_id ? 920 : 680, maxHeight: "90vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {assessment ? a(assessment.title) : t("assessments.view")}
            </h2>
            {assessment && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, flexShrink: 0,
                background: "#ecfdf5", color: "#059669",
              }}>
                {t("assessments.publishedStatus")}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 48, color: "#64748b" }}>
              <Loader2 size={20} className="animate-spin" /> {t("common.loading")}
            </div>
          ) : error ? (
            <p style={{ color: "#e11d48", fontSize: 13 }}>{error}</p>
          ) : assessment ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: a("Niveau"), value: a(assessment.grade) },
                  { label: t("common.atelier"), value: tp("evaluation.workshopN", { n: assessment.atelier }) },
                  { label: a("Unité"), value: assessment.unit ? a(assessment.unit) : "—" },
                  { label: a("Assignation"), value: assignedLabel(assessment.assigned_to) },
                ].map((row) => (
                  <div key={row.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{row.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
                {assessment.template_id ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
                      {templateLabel(assessment.template_id)}
                    </div>
                    <WorkshopTemplatePreview
                      template={getWorkshopTemplate(assessment.template_id as WorkshopTemplateId)}
                      draft={assessment.template_draft as TemplateDraft | undefined}
                    />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
                      {a("Questions")} ({assessment.questions.length})
                    </div>
                    {assessment.questions.length === 0 ? (
                      <p style={{ fontSize: 13, color: "#94a3b8" }}>{a("Aucune question pour cette évaluation.")}</p>
                    ) : (
                      assessment.questions.map((q, qi) => (
                        <div key={q.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Q{qi + 1}</div>
                          <p style={{ fontSize: 13, color: "#1e293b", margin: "0 0 8px", fontWeight: 500 }}>{q.text}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                            {q.options.map((opt, oi) => (
                              <div key={oi} style={{
                                fontSize: 12, padding: "5px 10px", borderRadius: 6,
                                background: oi === q.correct ? "#ecfdf5" : "white",
                                border: `1px solid ${oi === q.correct ? "#a7f3d0" : "#e2e8f0"}`,
                                color: oi === q.correct ? "#059669" : "#374151",
                                display: "flex", alignItems: "center", gap: 5,
                              }}>
                                {oi === q.correct && <CheckSquare size={11} />}
                                <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SchoolAssessmentsPage() {
  const navigate = useNavigate();
  const { t, auto, tp } = useLanguage();
  const handleLogout = usePortalLogout();

  const [assessments, setAssessments] = useState<SchoolAssessmentRecord[]>([]);
  const [archivedAssessments, setArchivedAssessments] = useState<SchoolAssessmentRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, drafts: 0, archived: 0 });
  const [canEdit, setCanEdit] = useState(false);
  const [syncSource, setSyncSource] = useState<"board" | "platform">("platform");
  const [schoolBoardName, setSchoolBoardName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAssessment, setViewAssessment] = useState<SchoolAssessmentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editAssessment, setEditAssessment] = useState<AssessmentEditData | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editingOwnership, setEditingOwnership] = useState<SchoolAssessmentRecord["ownership"]>("platform");
  const [savingStatus, setSavingStatus] = useState<"draft" | "publish" | null>(null);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await schoolAssessmentsApi.list({
        search: search || undefined,
        grade: gradeFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setAssessments(result.assessments);
      setArchivedAssessments(result.archived);
      setSummary(result.summary);
      setCanEdit(result.can_edit);
      setSyncSource(result.sync_source);
      setSchoolBoardName(result.school_board?.name ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments.");
      setAssessments([]);
      setArchivedAssessments([]);
      setSummary({ total: 0, published: 0, drafts: 0, archived: 0 });
    } finally {
      setLoading(false);
    }
  }, [search, gradeFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadAssessments, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadAssessments, search]);

  const assignedLabel = (key: SchoolAssessmentRecord["assigned_to"]) => {
    if (key === "board_only") return t("assessments.boardOnly");
    if (key === "school_only") return t("assessments.schoolOnly");
    if (key === "all_schools") return t("assessments.allSchools");
    if (key === "selected") return t("assessments.selected");
    return t("assessments.notAssigned");
  };

  const ownershipLabel = (ownership: SchoolAssessmentRecord["ownership"]) => {
    if (ownership === "board_copy") return t("assessments.boardCopy");
    if (ownership === "school_copy") return t("assessments.schoolCopy");
    return t("assessments.platformOriginal");
  };

  const openView = async (id: number) => {
    setViewOpen(true);
    setViewAssessment(null);
    setViewError("");
    setViewLoading(true);
    try {
      const result = await schoolAssessmentsApi.get(id);
      setViewAssessment(result.assessment);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Failed to load assessment.");
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    if (!viewLoading) {
      setViewOpen(false);
      setViewAssessment(null);
      setViewError("");
    }
  };

  const toEditData = (assessment: SchoolAssessmentDetail): AssessmentEditData => ({
    id: assessment.id,
    title: assessment.title,
    unit: assessment.unit,
    atelier: assessment.atelier,
    grade: assessment.grade,
    status: assessment.status === "published" ? "Published" : "Draft",
    template_id: assessment.template_id ?? null,
    template_draft: assessment.template_draft as AssessmentEditData["template_draft"],
    questions: assessment.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correct: q.correct,
    })),
  });

  const toPayload = (data: AssessmentEditData, status: "Published" | "Draft"): SchoolAssessmentPayload => ({
    title: data.title.trim() || tp("assessments.defaultTitle", { n: data.atelier }),
    unit: data.unit ?? "",
    atelier: data.atelier,
    grade: data.grade,
    status,
    template_id: data.template_id ?? null,
    template_draft: data.template_draft ?? null,
    questions: data.questions.map((q) => ({
      text: q.text,
      options: q.options,
      correct: q.correct,
    })),
  });

  const openEdit = async (id: number) => {
    setEditOpen(true);
    setEditAssessment(null);
    setEditError("");
    setEditLoading(true);
    try {
      const result = await schoolAssessmentsApi.get(id);
      setEditAssessment(toEditData(result.assessment));
      setEditingOwnership(result.assessment.ownership);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to load assessment.");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    if (!editLoading && !savingStatus) {
      setEditOpen(false);
      setEditAssessment(null);
      setEditError("");
      setEditingOwnership("platform");
    }
  };

  const handleSave = async (data: AssessmentEditData, status: "Published" | "Draft") => {
    if (!data.id) return;

    setSavingStatus(status === "Published" ? "publish" : "draft");
    setEditError("");
    try {
      const result = await schoolAssessmentsApi.update(data.id, toPayload(data, status));
      setEditOpen(false);
      setEditAssessment(null);
      setEditingOwnership("platform");
      setSaveNotice(result.created_copy ? t("assessments.schoolCopyCreated") : "");
      await loadAssessments();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingStatus(null);
    }
  };

  const handleActivate = async (id: number) => {
    setActivatingId(id);
    setSaveNotice("");
    try {
      await schoolAssessmentsApi.activate(id);
      await loadAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate assessment.");
    } finally {
      setActivatingId(null);
    }
  };

  const syncBannerText = syncSource === "board" && schoolBoardName
    ? tp("assessments.syncedFromBoard", { name: schoolBoardName })
    : canEdit
      ? t("assessments.syncedFromPlatformEditable")
      : t("assessments.syncedFromPlatform");

  const syncSubtext = !canEdit && syncSource === "board"
    ? t("assessments.viewOnlyBoard")
    : null;

  const navItems = [
    { icon: TrendingUp, label: "Overview", path: "/school/reports", active: false },
    { icon: GraduationCap, label: "Academics", path: "/school/academics", active: false },
    { icon: ClipboardList, label: "Assessments", path: "/school/assessments", active: true },
    { icon: UserPlus, label: t("nav.teacherRequests"), path: "/school/teachers", active: false },
    { icon: User, label: "Profile", path: "/profile?portal=school", active: false },
    { icon: Settings, label: "Settings", path: "/school/settings", active: false },
  ];

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

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#004aad", margin: 0 }}>{t("assessments.title")}</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{t("assessments.subtitle")}</p>
        </div>

        <div style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <CheckCircle2 size={15} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", margin: 0 }}>{t("assessments.accessEnabled")}</p>
            <p style={{ fontSize: 12, color: "#3b82f6", margin: "2px 0 0" }}>{syncBannerText}</p>
            {syncSubtext && (
              <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>{syncSubtext}</p>
            )}
          </div>
        </div>

        {saveNotice && (
          <div style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 16, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: 13 }}>
            {saveNotice}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: canEdit ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 16, marginBottom: 24, maxWidth: canEdit ? 720 : 480 }}>
          {(canEdit
            ? [
                { label: t("assessments.total"), value: summary.total, color: "#004aad" },
                { label: t("assessments.published"), value: summary.published, color: "#059669" },
                { label: t("assessments.drafts"), value: summary.drafts, color: "#d97706" },
                { label: t("assessments.archiveTitle"), value: summary.archived, color: "#64748b" },
              ]
            : [
                { label: t("assessments.total"), value: summary.total, color: "#004aad" },
                { label: t("assessments.published"), value: summary.published, color: "#059669" },
              ]
          ).map((s) => (
            <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "18px 20px", border: "1px solid #dff3ff", boxShadow: "0 1px 4px rgba(0,74,173,0.06)" }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0 }}>{loading ? "—" : s.value}</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("assessments.searchPlaceholder")}
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #dff3ff", fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
              style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #dff3ff", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
              {GRADE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {"labelKey" in opt ? t(opt.labelKey) : opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          {canEdit && (
            <div style={{ position: "relative" }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #dff3ff", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
                <option value="all">{auto("Tous")}</option>
                <option value="published">{t("assessments.publishedStatus")}</option>
                <option value="draft">{t("assessments.draftStatus")}</option>
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 60, color: "#64748b" }}>
            <Loader2 size={24} className="animate-spin" /> {t("common.loading")}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {assessments.map((item) => (
              <div key={item.id} style={{ background: "white", borderRadius: 14, padding: "18px 20px", border: "1px solid #dff3ff", boxShadow: "0 1px 3px rgba(0,74,173,0.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                  <div style={{ background: "#dff3ff", borderRadius: 8, padding: 8 }}>
                    <ClipboardList size={16} color="#004aad" />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                    {(syncSource === "board" || item.ownership !== "platform") && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: item.ownership === "board_copy" ? "#ede9fe" : item.ownership === "school_copy" ? "#ecfdf5" : "#f1f5f9", color: item.ownership === "board_copy" ? "#6d28d9" : item.ownership === "school_copy" ? "#047857" : "#64748b" }}>
                        {ownershipLabel(item.ownership)}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: item.status === "published" ? "#ecfdf5" : "#fffbeb", color: item.status === "published" ? "#059669" : "#d97706" }}>
                      {item.status === "published" ? t("assessments.publishedStatus") : t("assessments.draftStatus")}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4, lineHeight: 1.4 }}>{auto(item.title)}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                  {item.unit ? `${auto(item.unit)} · ` : ""}{tp("evaluation.workshopN", { n: item.atelier })} · {auto(item.grade)}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {templateLabel(item.template_id) ?? auto(`${item.question_count} question${item.question_count !== 1 ? "s" : ""}`)}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 8 }}>
                    {assignedLabel(item.assigned_to)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => openView(item.id)}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Eye size={12} /> {t("assessments.view")}
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => openEdit(item.id)}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Edit2 size={12} /> {t("common.edit")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && assessments.length === 0 && (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {t("assessments.noneFound")}
          </div>
        )}

        {!loading && canEdit && archivedAssessments.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Archive size={18} color="#64748b" />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", margin: 0 }}>{t("assessments.archiveTitle")}</h2>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{t("assessments.archiveHint")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {archivedAssessments.map((item) => (
                <div key={item.id} style={{ background: "#fafafa", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                    <div style={{ background: "#f1f5f9", borderRadius: 8, padding: 8 }}>
                      <ClipboardList size={16} color="#64748b" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: "#f1f5f9", color: "#64748b" }}>
                      {t("assessments.inactive")}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4, lineHeight: 1.4 }}>{auto(item.title)}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                    {item.unit ? `${auto(item.unit)} · ` : ""}{tp("evaluation.workshopN", { n: item.atelier })} · {auto(item.grade)}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => openView(item.id)}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Eye size={12} /> {t("assessments.view")}
                    </button>
                    <button type="button" onClick={() => handleActivate(item.id)} disabled={activatingId === item.id}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: activatingId === item.id ? "wait" : "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {activatingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      {t("assessments.activate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {viewOpen && (
        <AssessmentViewModal
          assessment={viewAssessment}
          loading={viewLoading}
          error={viewError}
          onClose={closeView}
          assignedLabel={assignedLabel}
          t={t}
          tp={tp}
          a={auto}
        />
      )}

      {editOpen && (
        <AssessmentEditModal
          open={editOpen}
          assessment={editAssessment}
          loading={editLoading}
          error={editError}
          savingStatus={savingStatus}
          onClose={closeEdit}
          onSave={handleSave}
          notice={editingOwnership === "platform" ? t("assessments.editCreatesSchoolCopy") : ""}
        />
      )}
    </div>
  );
}
