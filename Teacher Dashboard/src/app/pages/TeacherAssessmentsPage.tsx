import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Search, ChevronDown, Eye, Edit2, Loader2, X, CheckSquare, Archive, RotateCcw,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { TeacherLayout } from "../components/TeacherLayout";
import { AssessmentEditModal, type AssessmentEditData } from "../components/AssessmentEditModal";
import {
  teacherAssessmentsApi,
  type TeacherAssessmentDetail,
  type TeacherAssessmentPayload,
  type TeacherAssessmentRecord,
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

function AssessmentCard({
  item,
  canEdit,
  assignedLabel,
  ownershipLabel,
  t,
  tp,
  a,
  onView,
  onEdit,
  onActivate,
  activating,
  archived = false,
}: {
  item: TeacherAssessmentRecord;
  canEdit: boolean;
  assignedLabel: (key: TeacherAssessmentRecord["assigned_to"]) => string;
  ownershipLabel: (ownership: TeacherAssessmentRecord["ownership"]) => string;
  t: ReturnType<typeof useLanguage>["t"];
  tp: ReturnType<typeof useLanguage>["tp"];
  a: ReturnType<typeof useLanguage>["auto"];
  onView: (id: number) => void;
  onEdit?: (id: number) => void;
  onActivate?: (id: number) => void;
  activating?: boolean;
  archived?: boolean;
}) {
  const ownershipColors = item.ownership === "teacher_copy"
    ? { bg: "#eff6ff", color: "#1d4ed8" }
    : item.ownership === "school_copy"
      ? { bg: "#ecfdf5", color: "#047857" }
      : item.ownership === "board_copy"
        ? { bg: "#ede9fe", color: "#6d28d9" }
        : { bg: "#f1f5f9", color: "#64748b" };

  return (
    <div className="rounded-2xl p-5" style={{ background: archived ? "#fafafa" : "white", border: `1px solid ${archived ? "#e2e8f0" : "#dbeafe"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="rounded-lg p-2" style={{ background: archived ? "#f1f5f9" : "#dff3ff" }}>
          <ClipboardList size={16} style={{ color: archived ? "#64748b" : "#004aad" }} />
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: ownershipColors.bg, color: ownershipColors.color }}>
            {ownershipLabel(item.ownership)}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
            background: archived ? "#f1f5f9" : item.status === "published" ? "#ecfdf5" : "#fffbeb",
            color: archived ? "#64748b" : item.status === "published" ? "#059669" : "#d97706",
          }}>
            {archived ? t("assessments.inactive") : item.status === "published" ? t("assessments.publishedStatus") : t("assessments.draftStatus")}
          </span>
        </div>
      </div>

      <p className="font-semibold text-sm mb-1" style={{ color: "#1e293b", lineHeight: 1.4 }}>{a(item.title)}</p>
      <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
        {item.unit ? `${a(item.unit)} · ` : ""}{tp("evaluation.workshopN", { n: item.atelier })} · {a(item.grade)}
      </p>

      <div className="flex items-center justify-between text-xs mb-4" style={{ color: "#94a3b8" }}>
        <span>
          {templateLabel(item.template_id) ?? (
            <>
              {item.question_count} {item.question_count === 1 ? a("question") : a("questions")}
            </>
          )}
          {item.created ? ` · ${item.created}` : ""}
        </span>
        <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 8, color: "#64748b" }}>
          {assignedLabel(item.assigned_to)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onView(item.id)}
          style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
        >
          <Eye size={12} /> {t("assessments.view")}
        </button>
        {canEdit && (
          archived ? (
            <button
              type="button"
              onClick={() => onActivate?.(item.id)}
              disabled={activating}
              style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: activating ? "wait" : "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              {activating ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {t("assessments.activate")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEdit?.(item.id)}
              style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <Edit2 size={12} /> {t("common.edit")}
            </button>
          )
        )}
      </div>
    </div>
  );
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
  assessment: TeacherAssessmentDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  assignedLabel: (key: TeacherAssessmentRecord["assigned_to"]) => string;
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
                background: assessment.status === "published" ? "#ecfdf5" : "#fffbeb",
                color: assessment.status === "published" ? "#059669" : "#d97706",
              }}>
                {assessment.status === "published" ? t("assessments.publishedStatus") : t("assessments.draftStatus")}
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

export function TeacherAssessmentsPage() {
  const { t, tp, auto: a } = useLanguage();
  const [assessments, setAssessments] = useState<TeacherAssessmentRecord[]>([]);
  const [archivedAssessments, setArchivedAssessments] = useState<TeacherAssessmentRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, drafts: 0, archived: 0 });
  const [canEdit, setCanEdit] = useState(false);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAssessment, setViewAssessment] = useState<TeacherAssessmentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editAssessment, setEditAssessment] = useState<AssessmentEditData | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editingOwnership, setEditingOwnership] = useState<TeacherAssessmentRecord["ownership"]>("platform");
  const [savingStatus, setSavingStatus] = useState<"draft" | "publish" | null>(null);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await teacherAssessmentsApi.list({
        search: search || undefined,
        grade: gradeFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setAssessments(result.assessments);
      setArchivedAssessments(result.archived);
      setSummary(result.summary);
      setCanEdit(result.can_edit);
      setSchoolId(result.school?.id ?? null);
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

  const assignedLabel = (key: TeacherAssessmentRecord["assigned_to"]) => {
    if (key === "board_only") return t("assessments.boardOnly");
    if (key === "school_only") return t("assessments.schoolOnly");
    if (key === "teacher_only") return t("assessments.teacherOnly");
    if (key === "all_schools") return t("assessments.allSchools");
    if (key === "selected") return t("assessments.selected");
    return t("assessments.notAssigned");
  };

  const ownershipLabel = (ownership: TeacherAssessmentRecord["ownership"]) => {
    if (ownership === "board_copy") return t("assessments.boardCopy");
    if (ownership === "school_copy") return t("assessments.schoolCopy");
    if (ownership === "teacher_copy") return t("assessments.teacherCopy");
    return t("assessments.platformOriginal");
  };

  const openView = async (id: number) => {
    setViewOpen(true);
    setViewAssessment(null);
    setViewError("");
    setViewLoading(true);
    try {
      const result = await teacherAssessmentsApi.get(id);
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

  const toEditData = (assessment: TeacherAssessmentDetail): AssessmentEditData => ({
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

  const toPayload = (data: AssessmentEditData, status: "Published" | "Draft"): TeacherAssessmentPayload => ({
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
      const result = await teacherAssessmentsApi.get(id);
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
      const result = await teacherAssessmentsApi.update(data.id, toPayload(data, status));
      setEditOpen(false);
      setEditAssessment(null);
      setEditingOwnership("platform");
      setSaveNotice(
        result.created_copy
          ? schoolId
            ? t("assessments.schoolCopyCreated")
            : t("assessments.teacherCopyCreated")
          : ""
      );
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
      await teacherAssessmentsApi.activate(id);
      await loadAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate assessment.");
    } finally {
      setActivatingId(null);
    }
  };

  const statCards = canEdit
    ? [
        { label: t("assessments.total"), value: loading ? "—" : summary.total, color: "#004aad" },
        { label: t("assessments.published"), value: loading ? "—" : summary.published, color: "#059669" },
        { label: t("assessments.drafts"), value: loading ? "—" : summary.drafts, color: "#d97706" },
        { label: t("assessments.archiveTitle"), value: loading ? "—" : summary.archived, color: "#64748b" },
      ]
    : [
        { label: t("assessments.total"), value: loading ? "—" : summary.total, color: "#004aad" },
        { label: t("assessments.published"), value: loading ? "—" : summary.published, color: "#059669" },
      ];

  return (
    <TeacherLayout activeNav="assessments" contentClassName="flex-1 overflow-y-auto p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{t("assessments.title")}</h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>{t("assessments.subtitle")}</p>
      </div>

      {saveNotice && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857" }}>
          {saveNotice}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48" }}>
          {error}
          <button onClick={loadAssessments} className="ml-3 underline" style={{ background: "none", border: "none", cursor: "pointer", color: "#e11d48" }}>
            Retry
          </button>
        </div>
      )}

      <div className={`grid gap-5 mb-8 ${canEdit ? "grid-cols-4" : "grid-cols-2"}`}>
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #dbeafe", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("assessments.searchPlaceholder")}
            style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #dbeafe", fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" }} />
        </div>
        <div style={{ position: "relative" }}>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
            style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #dbeafe", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
            {GRADE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {"labelKey" in o ? t(o.labelKey) : o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
        {canEdit && (
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #dbeafe", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
              <option value="all">{a("Tous")}</option>
              <option value="published">{t("assessments.publishedStatus")}</option>
              <option value="draft">{t("assessments.draftStatus")}</option>
            </select>
            <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24" style={{ color: "#64748b" }}>
          <Loader2 className="animate-spin" size={22} /> {t("common.loading")}
        </div>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {assessments.map((item) => (
              <AssessmentCard
                key={item.id}
                item={item}
                canEdit={canEdit}
                assignedLabel={assignedLabel}
                ownershipLabel={ownershipLabel}
                t={t}
                tp={tp}
                a={a}
                onView={openView}
                onEdit={openEdit}
              />
            ))}
          </div>

          {assessments.length === 0 && (
            <div className="text-center py-16" style={{ color: "#94a3b8" }}>{t("assessments.noneFound")}</div>
          )}

          {canEdit && archivedAssessments.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-2">
                <Archive size={18} style={{ color: "#64748b" }} />
                <h2 className="text-lg font-semibold" style={{ color: "#1e293b" }}>{t("assessments.archiveTitle")}</h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>{t("assessments.archiveHint")}</p>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {archivedAssessments.map((item) => (
                  <AssessmentCard
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    assignedLabel={assignedLabel}
                    ownershipLabel={ownershipLabel}
                    t={t}
                    tp={tp}
                    a={a}
                    onView={openView}
                    onActivate={handleActivate}
                    activating={activatingId === item.id}
                    archived
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {viewOpen && (
        <AssessmentViewModal
          assessment={viewAssessment}
          loading={viewLoading}
          error={viewError}
          onClose={closeView}
          assignedLabel={assignedLabel}
          t={t}
          tp={tp}
          a={a}
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
          notice={editingOwnership === "platform" ? (schoolId ? t("assessments.editCreatesSchoolCopy") : t("assessments.editCreatesTeacherCopy")) : ""}
        />
      )}
    </TeacherLayout>
  );
}
