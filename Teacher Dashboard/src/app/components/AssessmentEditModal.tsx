import { useEffect, useState, type KeyboardEvent } from "react";
import { X, Trash2, CheckSquare, Loader2 } from "lucide-react";

const ATELIER_OPTIONS = [
  "Atelier 1", "Atelier 2", "Atelier 3", "Atelier 4", "Atelier 5",
  "Atelier 6", "Atelier 7", "Atelier 8", "Atelier 9", "Atelier 10",
  "Atelier 11", "Atelier 12", "Atelier 13", "Atelier 14", "Atelier 15",
];

type Question = {
  id: number;
  text: string;
  options: string[];
  correct: number;
};

export type AssessmentEditData = {
  id?: number;
  title: string;
  unit?: string;
  atelier: number;
  grade: string;
  status?: string;
  questions: Question[];
};

export function AssessmentEditModal({
  assessment,
  loading,
  error,
  savingStatus,
  onClose,
  onSave,
  title = "Edit Assessment",
  notice = "",
}: {
  assessment: AssessmentEditData | null;
  loading: boolean;
  error: string;
  savingStatus: "draft" | "publish" | null;
  onClose: () => void;
  onSave: (data: AssessmentEditData, status: "Published" | "Draft") => void;
  title?: string;
  notice?: string;
}) {
  const [form, setForm] = useState<Partial<AssessmentEditData>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct: 0 });
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (!assessment) return;
    setForm(assessment);
    setQuestions(assessment.questions.map((q, i) => ({ ...q, id: q.id ?? i + 1 })));
    setNewQ({ text: "", options: ["", "", "", ""], correct: 0 });
    setAddError("");
  }, [assessment]);

  const saving = savingStatus !== null;
  const currentStatus = form.status === "published" || form.status === "Published" ? "Published" : "Draft";

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
      onClick={(e) => e.target === e.currentTarget && !saving && !loading && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: 680, maxHeight: "90vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>{title}</h2>
            {assessment?.id && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                background: currentStatus === "Published" ? "#ecfdf5" : "#fffbeb",
                color: currentStatus === "Published" ? "#059669" : "#d97706",
              }}>
                {currentStatus}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={saving || loading} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 48, color: "#64748b" }}>
              <Loader2 size={20} className="animate-spin" /> Loading…
            </div>
          ) : error && !assessment ? (
            <p style={{ color: "#e11d48", fontSize: 13 }}>{error}</p>
          ) : assessment ? (
            <>
              {notice && (
                <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: 12, lineHeight: 1.5 }}>
                  {notice}
                </div>
              )}
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

              {error && <p style={{ marginTop: 12, fontSize: 12, color: "#ef4444" }}>{error}</p>}
            </>
          ) : null}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "white" }}>
          <button type="button" onClick={onClose} disabled={saving || loading} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
          <button
            type="button"
            onClick={() => onSave({ ...form, title: form.title || "", atelier: form.atelier || 1, grade: form.grade || "Kindergarten", questions, id: assessment?.id }, "Draft")}
            disabled={saving || loading || !assessment}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: saving ? "wait" : "pointer", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}
          >
            {savingStatus === "draft" && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...form, title: form.title || "", atelier: form.atelier || 1, grade: form.grade || "Kindergarten", questions, id: assessment?.id }, "Published")}
            disabled={saving || loading || !assessment || questions.length === 0}
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
