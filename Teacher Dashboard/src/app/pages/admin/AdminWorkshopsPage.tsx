import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown, ClipboardList, CheckSquare, Copy, Loader2, Archive, RotateCcw,
} from "lucide-react";
import {
  adminAssessmentsApi,
  type AdminAssessmentPayload,
  type AdminAssessmentQuestion,
  type AdminAssessmentRecord,
} from "../../api/client";
import { useLanguage } from "../../i18n";
import { workshopOptions } from "../../i18n/atelierHelpers";
import {
  WORKSHOP_TEMPLATES,
  buildTemplateDrafts,
  resolveTemplateName,
  type TemplateDraft,
  type WorkshopTemplateId,
} from "../../evaluation/workshopTemplates";
import { WorkshopTemplatePreview } from "../../components/WorkshopTemplatePreview";

const ASSESSMENT_GRADES = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 3+"] as const;

type Assessment = AdminAssessmentRecord;

function templateFormatLabel(format: (typeof WORKSHOP_TEMPLATES)[number]["format"]): string {
  if (format === "letter_grid") return "Letter grid";
  if (format === "word_sound_list") return "Sound identification";
  if (format === "mixed_sections") return "Syllable & grapheme";
  if (format === "item_grid_sections") return "Reading grids";
  if (format === "mixed_reading_sections") return "Word families & reading";
  if (format === "fluency_sections") return "Fluency & decoding";
  if (format === "comprehension_sections") return "Listening comprehension";
  if (format === "multiple_choice") return "Multiple choice";
  return "Section checklists";
}

function AssessmentModal({ assessment, onClose, onSave, savingStatus }: {
  assessment: Partial<Assessment>;
  onClose: () => void;
  onSave: (a: Partial<Assessment>, status: "Published" | "Draft") => void;
  savingStatus: "draft" | "publish" | null;
}) {
  const { t, tp } = useLanguage();
  const atelierOptions = workshopOptions((n) => tp("evaluation.workshopN", { n }));
  const isNew = !assessment.id;
  const isLegacyMcq = !isNew && !assessment.template_id && (assessment.questions?.length ?? 0) > 0;
  const usesTemplate = isNew || !!assessment.template_id || !isLegacyMcq;

  const [form, setForm] = useState<Partial<Assessment>>(assessment);
  const [selectedTemplateId, setSelectedTemplateId] = useState<WorkshopTemplateId | "">(
    (assessment.template_id as WorkshopTemplateId) ?? ""
  );
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(
    assessment.template_draft ?? null
  );
  const [questions, setQuestions] = useState<Question[]>(
    (assessment.questions ?? []).map((q, i) => ({ ...q, id: q.id ?? i + 1 }))
  );
  const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct: 0 });
  const [addError, setAddError] = useState("");

  const saving = savingStatus !== null;
  const currentStatus = assessment.status ?? "Draft";
  const selectedTemplate = selectedTemplateId
    ? WORKSHOP_TEMPLATES.find((item) => item.id === selectedTemplateId) ?? null
    : null;

  useEffect(() => {
    if (!assessment.template_id || assessment.template_draft) return;
    const draft = buildTemplateDrafts()[assessment.template_id as WorkshopTemplateId];
    if (draft) setTemplateDraft(draft);
  }, [assessment.template_id, assessment.template_draft]);

  const handleTemplateSelect = (id: WorkshopTemplateId) => {
    setSelectedTemplateId(id);
    const draft = JSON.parse(JSON.stringify(buildTemplateDrafts()[id])) as TemplateDraft;
    setTemplateDraft(draft);
    setForm((prev) => ({
      ...prev,
      title: prev.title?.trim() || resolveTemplateName(id, draft),
    }));
  };

  const addQuestion = () => {
    const text = newQ.text.trim();
    if (!text) {
      setAddError("Enter a question before adding.");
      return;
    }

    const options = newQ.options.map((o, i) => o.trim() || `Option ${String.fromCharCode(65 + i)}`);
    if (!options[newQ.correct]?.trim()) {
      setAddError("Fill in the correct answer option.");
      return;
    }

    setQuestions((prev) => [
      ...prev,
      {
        text,
        options,
        correct: newQ.correct,
        id: -(Date.now() + prev.length),
      },
    ]);
    setNewQ({ text: "", options: ["", "", "", ""], correct: 0 });
    setAddError("");
  };

  const handleNewQKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addQuestion();
    }
  };

  const updateQuestion = (index: number, patch: Partial<Pick<Question, "text" | "options" | "correct">>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateQuestionOption = (index: number, optionIndex: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== index) return q;
      const options = [...q.options];
      options[optionIndex] = value;
      return { ...q, options };
    }));
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const optionInputStyle = {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    outline: "none",
  };

  const canPublish = usesTemplate
    ? !!selectedTemplateId && !!templateDraft
    : questions.length > 0;

  const buildSaveData = (): Partial<Assessment> => {
    if (usesTemplate) {
      return {
        ...form,
        template_id: selectedTemplateId || null,
        template_draft: templateDraft,
        questions: [],
      };
    }
    return { ...form, questions, template_id: null, template_draft: null };
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: usesTemplate ? 920 : 680, maxHeight: "90vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>
              {assessment.id ? "Edit Assessment" : "New Assessment"}
            </h2>
            {assessment.id && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                background: currentStatus === "Published" ? "#ecfdf5" : "#fffbeb",
                color: currentStatus === "Published" ? "#059669" : "#d97706",
              }}>
                {currentStatus}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Assessment Title</label>
              <input
                value={form.title || ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={tp("assessments.defaultTitle", { n: form.atelier || 1 })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Grade Level</label>
              <select
                value={form.grade || "Kindergarten"}
                onChange={(e) => setForm((x) => ({ ...x, grade: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                {ASSESSMENT_GRADES.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{t("common.atelier")}</label>
              <select
                value={form.atelier || 1}
                onChange={(e) => setForm((x) => ({ ...x, atelier: parseInt(e.target.value, 10) }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                {atelierOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {usesTemplate ? (
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value as WorkshopTemplateId)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", marginBottom: 16 }}
              >
                <option value="">Select a template…</option>
                {WORKSHOP_TEMPLATES.map((template) => {
                  const draft = buildTemplateDrafts()[template.id];
                  return (
                    <option key={template.id} value={template.id}>
                      {resolveTemplateName(template.id, draft)}
                    </option>
                  );
                })}
              </select>

              {selectedTemplate && templateDraft ? (
                <div
                  style={{
                    background: "#f8fbff",
                    borderRadius: 12,
                    padding: 20,
                    border: "1px solid #dff3ff",
                  }}
                >
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>
                    Loaded <strong style={{ color: "#334155" }}>{templateFormatLabel(selectedTemplate.format)}</strong> template.
                    Edit any field below before saving.
                  </p>
                  <WorkshopTemplatePreview
                    template={selectedTemplate}
                    draft={templateDraft}
                    onDraftChange={setTemplateDraft}
                    editable
                  />
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Choose a template to load its structure. You can use it as-is or customize it before publishing.
                </p>
              )}
            </div>
          ) : (
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
              Questions ({questions.length})
            </div>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Q{qi + 1}</span>
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                    title="Delete question"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  placeholder="Question text"
                  style={{ ...inputStyle, marginBottom: 8, background: "white" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px",
                        borderRadius: 6,
                        background: oi === q.correct ? "#ecfdf5" : "white",
                        border: `1px solid ${oi === q.correct ? "#a7f3d0" : "#e2e8f0"}`,
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}-correct`}
                        checked={q.correct === oi}
                        onChange={() => updateQuestion(qi, { correct: oi })}
                        title="Mark as correct answer"
                      />
                      <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>{String.fromCharCode(65 + oi)}.</span>
                      <input
                        value={opt}
                        onChange={(e) => updateQuestionOption(qi, oi, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        style={{
                          ...optionInputStyle,
                          border: "none",
                          background: "transparent",
                          color: oi === q.correct ? "#059669" : "#374151",
                        }}
                      />
                      {oi === q.correct && <CheckSquare size={11} color="#059669" style={{ flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "14px", border: "1px solid #dbeafe" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 10 }}>+ New Question</div>
              <input
                value={newQ.text}
                onChange={(e) => { setNewQ((q) => ({ ...q, text: e.target.value })); setAddError(""); }}
                onKeyDown={handleNewQKeyDown}
                placeholder="Question text"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #bfdbfe", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {newQ.options.map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <input type="radio" name="new-question-correct" checked={newQ.correct === oi} onChange={() => setNewQ((q) => ({ ...q, correct: oi }))} />
                    <input
                      value={opt}
                      onChange={(e) => { setNewQ((q) => ({ ...q, options: q.options.map((o, i) => i === oi ? e.target.value : o) })); setAddError(""); }}
                      onKeyDown={handleNewQKeyDown}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #bfdbfe", fontSize: 12, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
              {addError && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#dc2626" }}>{addError}</p>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); addQuestion(); }}
                style={{ marginTop: 8, padding: "7px 14px", borderRadius: 7, border: "none", background: "#3b82f6", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Add Question
              </button>
            </div>
          </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "white" }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
          <button
            type="button"
            onClick={() => onSave(buildSaveData(), "Draft")}
            disabled={saving || (usesTemplate && !selectedTemplateId)}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: saving ? "wait" : "pointer", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}
          >
            {savingStatus === "draft" && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => onSave(buildSaveData(), "Published")}
            disabled={saving || !canPublish}
            title={!canPublish ? (usesTemplate ? "Select a template before publishing" : "Add at least one question to publish") : undefined}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: !canPublish ? "#94a3b8" : "#004aad", color: "white", fontSize: 13, cursor: saving || !canPublish ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {savingStatus === "publish" && <Loader2 size={14} className="animate-spin" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkshopCard({
  assessment,
  actionId,
  auto,
  t,
  tp,
  archived = false,
  onDuplicate,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: {
  assessment: Assessment;
  actionId: number | null;
  auto: ReturnType<typeof useLanguage>["auto"];
  t: ReturnType<typeof useLanguage>["t"];
  tp: ReturnType<typeof useLanguage>["tp"];
  archived?: boolean;
  onDuplicate: (id: number) => void;
  onEdit: (assessment: Assessment) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
}) {
  const busy = actionId === assessment.id;
  const hasStudentRecords = assessment.has_student_completions ?? false;

  return (
    <div style={{
      background: archived ? "#fafafa" : "white",
      borderRadius: 12,
      padding: "18px 20px",
      border: `1px solid ${archived ? "#e2e8f0" : "#f1f5f9"}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      opacity: archived ? 0.92 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ background: archived ? "#f1f5f9" : "#dff3ff", borderRadius: 8, padding: 8 }}>
          <ClipboardList size={16} color={archived ? "#64748b" : "#004aad"} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
            background: archived ? "#f1f5f9" : assessment.status === "Published" ? "#ecfdf5" : "#fffbeb",
            color: archived ? "#64748b" : assessment.status === "Published" ? "#059669" : "#d97706",
          }}>
            {archived ? t("assessments.inactive") : assessment.status}
          </span>
          {hasStudentRecords && !archived && (
            <span style={{ fontSize: 10, color: "#64748b" }}>{t("admin.workshops.hasStudentRecords")}</span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 5, lineHeight: 1.4 }}>{auto(assessment.title)}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        {tp("evaluation.workshopN", { n: assessment.atelier })} · {assessment.grade}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f8fafc" }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {assessment.template_id
            ? `Template · ${assessment.template_id.replace("format_", "Format ")}`
            : `${assessment.questions.length} question${assessment.questions.length !== 1 ? "s" : ""}`}
          {" · "}{assessment.created}
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          {!archived && (
            <>
              <button
                onClick={() => onDuplicate(assessment.id)}
                disabled={busy}
                style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
              >
                {busy ? <Loader2 size={12} className="animate-spin" color="#64748b" /> : <Copy size={12} color="#64748b" />}
              </button>
              <button
                onClick={() => onEdit(assessment)}
                style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
              >
                <Edit2 size={12} color="#64748b" />
              </button>
            </>
          )}
          {archived ? (
            <button
              onClick={() => onRestore(assessment.id)}
              disabled={busy}
              title={t("admin.workshops.restoreAction")}
              style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #dbeafe", background: "#eff6ff", cursor: "pointer" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" color="#004aad" /> : <RotateCcw size={12} color="#004aad" />}
            </button>
          ) : hasStudentRecords ? (
            <button
              onClick={() => onArchive(assessment.id)}
              disabled={busy}
              title={t("admin.workshops.archiveAction")}
              style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" color="#64748b" /> : <Archive size={12} color="#64748b" />}
            </button>
          ) : (
            <button
              onClick={() => onDelete(assessment.id)}
              disabled={busy}
              style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" color="#ef4444" /> : <Trash2 size={12} color="#ef4444" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminWorkshopsPage() {
  const { t, tp, auto } = useLanguage();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [archivedAssessments, setArchivedAssessments] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState({ published: 0, drafts: 0, archived: 0 });
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<Partial<Assessment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminAssessmentsApi.list({
        search: search || undefined,
        grade: gradeFilter,
        status: statusFilter,
      });
      setAssessments(result.assessments);
      setArchivedAssessments(result.archived ?? []);
      setSummary(result.summary ?? {
        published: result.assessments.filter((a) => a.status === "Published").length,
        drafts: result.assessments.filter((a) => a.status === "Draft").length,
        archived: result.archived?.length ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }, [search, gradeFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadAssessments, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadAssessments, search]);

  const publishedCount = summary.published;
  const draftCount = summary.drafts;
  const archivedCount = summary.archived;

  const toPayload = (data: Partial<Assessment>): AdminAssessmentPayload => {
    const atelier = data.atelier ?? 1;
    const usesTemplate = !!data.template_id && !!data.template_draft;

    return {
      title: data.title?.trim() || tp("assessments.defaultTitle", { n: atelier }),
      unit: data.unit ?? "",
      atelier,
      grade: data.grade ?? "Kindergarten",
      status: data.status ?? "Draft",
      template_id: usesTemplate ? data.template_id : null,
      template_draft: usesTemplate ? data.template_draft : null,
      questions: usesTemplate
        ? []
        : (data.questions ?? []).map((q) => ({
            text: q.text,
            options: q.options,
            correct: q.correct,
          })),
    };
  };

  const handleSave = async (data: Partial<Assessment>, status: "Published" | "Draft") => {
    setSavingStatus(status === "Published" ? "publish" : "draft");
    setError("");
    try {
      const payload = toPayload({ ...data, status });
      if (data.id) {
        const result = await adminAssessmentsApi.update(data.id, payload);
        setAssessments((prev) => prev.map((a) => (a.id === data.id ? result.assessment : a)));
      } else {
        const result = await adminAssessmentsApi.create(payload);
        setAssessments((prev) => [result.assessment, ...prev]);
      }
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assessment.");
    } finally {
      setSavingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    const target = assessments.find((a) => a.id === id);
    if (target?.has_student_completions) {
      setError(t("admin.workshops.cannotDelete"));
      return;
    }
    if (!window.confirm("Delete this assessment permanently?")) return;

    setActionId(id);
    setError("");
    try {
      await adminAssessmentsApi.remove(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      if (err instanceof Error && err.message.includes("cannot be deleted")) {
        setError(t("admin.workshops.cannotDelete"));
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete assessment.");
      }
    } finally {
      setActionId(null);
    }
  };

  const handleArchive = async (id: number) => {
    setActionId(id);
    setError("");
    try {
      const result = await adminAssessmentsApi.archive(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      setArchivedAssessments((prev) => [result.assessment, ...prev]);
      setSummary((prev) => ({
        ...prev,
        published: result.assessment.status === "Published" ? Math.max(0, prev.published - 1) : prev.published,
        drafts: result.assessment.status === "Draft" ? Math.max(0, prev.drafts - 1) : prev.drafts,
        archived: prev.archived + 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive assessment.");
    } finally {
      setActionId(null);
    }
  };

  const handleRestore = async (id: number) => {
    setActionId(id);
    setError("");
    try {
      const result = await adminAssessmentsApi.restore(id);
      setArchivedAssessments((prev) => prev.filter((a) => a.id !== id));
      setAssessments((prev) => [result.assessment, ...prev]);
      setSummary((prev) => ({
        ...prev,
        published: result.assessment.status === "Published" ? prev.published + 1 : prev.published,
        drafts: result.assessment.status === "Draft" ? prev.drafts + 1 : prev.drafts,
        archived: Math.max(0, prev.archived - 1),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore assessment.");
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    setActionId(id);
    setError("");
    try {
      const result = await adminAssessmentsApi.duplicate(id);
      setAssessments((prev) => [result.assessment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate assessment.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Workshops</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {publishedCount} published · {draftCount} drafts{archivedCount > 0 ? ` · ${archivedCount} archived` : ""}
            </p>
          </div>
          <button
            onClick={() => setModal({ status: "Draft", grade: "Kindergarten", atelier: 1, questions: [], title: "" })}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> New Assessment
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: gradeFilter, onChange: setGradeFilter, options: ["All Grades", ...ASSESSMENT_GRADES] },
            { value: statusFilter, onChange: setStatusFilter, options: ["All", "Published", "Draft"] },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}
              >
                {sel.options.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "#64748b", gap: 8, alignItems: "center" }}>
            <Loader2 size={20} className="animate-spin" /> Loading assessments…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {assessments.map((assessment) => (
              <WorkshopCard
                key={assessment.id}
                assessment={assessment}
                actionId={actionId}
                auto={auto}
                t={t}
                tp={tp}
                onDuplicate={handleDuplicate}
                onEdit={setModal}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onRestore={handleRestore}
              />
            ))}
          </div>
        )}
        {!loading && assessments.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No assessments found.</div>
        )}

        {!loading && archivedAssessments.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0a1628", margin: "0 0 6px" }}>
              {t("admin.workshops.archiveTitle")}
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 16px" }}>
              {t("admin.workshops.archiveHint")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {archivedAssessments.map((assessment) => (
                <WorkshopCard
                  key={assessment.id}
                  assessment={assessment}
                  actionId={actionId}
                  auto={auto}
                  t={t}
                  tp={tp}
                  archived
                  onDuplicate={handleDuplicate}
                  onEdit={setModal}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {modal && (
        <AssessmentModal
          assessment={modal}
          onClose={() => savingStatus === null && setModal(null)}
          onSave={handleSave}
          savingStatus={savingStatus}
        />
      )}
    </AdminLayout>
  );
}
