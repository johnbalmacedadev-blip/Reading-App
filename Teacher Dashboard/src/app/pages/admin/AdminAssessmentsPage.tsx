import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown, ClipboardList, CheckSquare, Copy, Loader2,
} from "lucide-react";
import {
  adminAssessmentsApi,
  type AdminAssessmentPayload,
  type AdminAssessmentQuestion,
  type AdminAssessmentRecord,
} from "../../api/client";

const ATELIER_OPTIONS = [
  "Atelier 1", "Atelier 2", "Atelier 3", "Atelier 4", "Atelier 5",
  "Atelier 6", "Atelier 7", "Atelier 8", "Atelier 9", "Atelier 10",
  "Atelier 11", "Atelier 12", "Atelier 13", "Atelier 14", "Atelier 15",
];

type Question = AdminAssessmentQuestion & { id: number };
type Assessment = AdminAssessmentRecord;

function toPayload(data: Partial<Assessment>): AdminAssessmentPayload {
  const atelier = data.atelier ?? 1;
  return {
    title: data.title?.trim() || `Atelier ${atelier} Assessment`,
    unit: data.unit ?? "",
    atelier,
    grade: data.grade ?? "Kindergarten",
    status: data.status ?? "Draft",
    questions: (data.questions ?? []).map((q) => ({
      text: q.text,
      options: q.options,
      correct: q.correct,
    })),
  };
}

function AssessmentModal({ assessment, onClose, onSave, savingStatus }: {
  assessment: Partial<Assessment>;
  onClose: () => void;
  onSave: (a: Partial<Assessment>, status: "Published" | "Draft") => void;
  savingStatus: "draft" | "publish" | null;
}) {
  const [form, setForm] = useState<Partial<Assessment>>(assessment);
  const [questions, setQuestions] = useState<Question[]>(
    (assessment.questions ?? []).map((q, i) => ({ ...q, id: q.id ?? i + 1 }))
  );
  const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct: 0 });
  const [addError, setAddError] = useState("");

  const saving = savingStatus !== null;
  const currentStatus = assessment.status ?? "Draft";

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

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: 680, maxHeight: "90vh",
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
                placeholder="e.g., Atelier 3 Assessment — Vowel Sounds"
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
                <option>Kindergarten</option>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Atelier</label>
              <select
                value={form.atelier || 1}
                onChange={(e) => setForm((x) => ({ ...x, atelier: parseInt(e.target.value, 10) }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                {ATELIER_OPTIONS.map((label, i) => (
                  <option key={i + 1} value={i + 1}>{label}</option>
                ))}
              </select>
            </div>
          </div>

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
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "white" }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
          <button
            type="button"
            onClick={() => onSave({ ...form, questions }, "Draft")}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: saving ? "wait" : "pointer", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}
          >
            {savingStatus === "draft" && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...form, questions }, "Published")}
            disabled={saving || questions.length === 0}
            title={questions.length === 0 ? "Add at least one question to publish" : undefined}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: questions.length === 0 ? "#94a3b8" : "#004aad", color: "white", fontSize: 13, cursor: saving || questions.length === 0 ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {savingStatus === "publish" && <Loader2 size={14} className="animate-spin" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
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

  const publishedCount = assessments.filter((a) => a.status === "Published").length;
  const draftCount = assessments.filter((a) => a.status === "Draft").length;

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
    setActionId(id);
    setError("");
    try {
      await adminAssessmentsApi.remove(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assessment.");
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
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Assessments</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {publishedCount} published · {draftCount} drafts
            </p>
          </div>
          <button
            onClick={() => setModal({ status: "Draft", grade: "Kindergarten", atelier: 1, questions: [], title: "Atelier 1 Assessment — " })}
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
            { value: gradeFilter, onChange: setGradeFilter, options: ["All Grades", "Kindergarten", "Grade 1", "Grade 2", "Grade 3"] },
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
            {assessments.map((a) => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ background: "#dff3ff", borderRadius: 8, padding: 8 }}>
                    <ClipboardList size={16} color="#004aad" />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                    background: a.status === "Published" ? "#ecfdf5" : "#fffbeb",
                    color: a.status === "Published" ? "#059669" : "#d97706",
                  }}>{a.status}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 5, lineHeight: 1.4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                  Atelier {a.atelier} · {a.grade}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f8fafc" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {a.questions.length} question{a.questions.length !== 1 ? "s" : ""} · {a.created}
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      onClick={() => handleDuplicate(a.id)}
                      disabled={actionId === a.id}
                      style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                    >
                      {actionId === a.id ? <Loader2 size={12} className="animate-spin" color="#64748b" /> : <Copy size={12} color="#64748b" />}
                    </button>
                    <button
                      onClick={() => setModal(a)}
                      style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                    >
                      <Edit2 size={12} color="#64748b" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={actionId === a.id}
                      style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer" }}
                    >
                      {actionId === a.id ? <Loader2 size={12} className="animate-spin" color="#ef4444" /> : <Trash2 size={12} color="#ef4444" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && assessments.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No assessments found.</div>
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
