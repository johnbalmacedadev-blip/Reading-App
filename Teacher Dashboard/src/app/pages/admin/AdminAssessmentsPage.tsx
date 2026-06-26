import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Trash2, X, ChevronDown, ClipboardList, CheckSquare, Copy } from "lucide-react";

const ATELIER_OPTIONS = [
  "Atelier 1", "Atelier 2", "Atelier 3", "Atelier 4", "Atelier 5",
  "Atelier 6", "Atelier 7", "Atelier 8", "Atelier 9", "Atelier 10",
  "Atelier 11", "Atelier 12", "Atelier 13", "Atelier 14", "Atelier 15",
];

type Question = { id: number; text: string; options: string[]; correct: number };
type Assessment = {
  id: number; title: string; unit: string; atelier: number;
  grade: string; questions: Question[]; status: "Published" | "Draft"; created: string;
};

const sampleQuestions: Question[] = [
  { id: 1, text: "What sound does the letter 'm' make?", options: ["/m/", "/b/", "/s/", "/t/"], correct: 0 },
  { id: 2, text: "How many syllables in the word 'maison'?", options: ["1", "2", "3", "4"], correct: 1 },
  { id: 3, text: "Which word starts with the /f/ sound?", options: ["bateau", "forêt", "soleil", "maison"], correct: 1 },
];

const initialAssessments: Assessment[] = [
  { id: 1, title: "Atelier 2 Assessment — Phonological Awareness", unit: "Unit 1", atelier: 2, grade: "Kindergarten", questions: sampleQuestions, status: "Published", created: "2025-09-01" },
  { id: 2, title: "Atelier 6 Assessment — Syllabic Reading", unit: "Unit 1", atelier: 6, grade: "Grade 1", questions: sampleQuestions.slice(0, 2), status: "Published", created: "2025-09-15" },
  { id: 3, title: "Unit 2 Assessment — Basic Decoding", unit: "Unit 2", atelier: 7, grade: "Grade 1", questions: sampleQuestions, status: "Published", created: "2025-10-01" },
  { id: 4, title: "Atelier 10 Assessment — Fluency", unit: "Unit 4", atelier: 10, grade: "Grade 2", questions: sampleQuestions.slice(0, 2), status: "Draft", created: "2025-11-10" },
  { id: 5, title: "Unit 6 Assessment — Comprehension", unit: "Unit 6", atelier: 11, grade: "Grade 2", questions: [], status: "Draft", created: "2025-12-01" },
];

function AssessmentModal({ assessment, onClose, onSave }: {
  assessment: Partial<Assessment>; onClose: () => void; onSave: (a: Partial<Assessment>) => void;
}) {
  const [form, setForm] = useState<Partial<Assessment>>(assessment);
  const [questions, setQuestions] = useState<Question[]>(assessment.questions || []);
  const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correct: 0 });

  const addQuestion = () => {
    if (!newQ.text.trim()) return;
    setQuestions((prev) => [...prev, { ...newQ, id: Date.now() }]);
    setNewQ({ text: "", options: ["", "", "", ""], correct: 0 });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 680, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>
            {assessment.id ? "Edit Assessment" : "New Assessment"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {/* Title */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Assessment Title</label>
              <input
                value={form.title || ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Atelier 3 Assessment — Vowel Sounds"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Unit */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Unit</label>
              <select
                value={form.unit || "Unit 1"}
                onChange={(e) => setForm((x) => ({ ...x, unit: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                <option>General</option>
                <option>Unit 1</option>
                <option>Unit 2</option>
                <option>Unit 3</option>
                <option>Unit 4</option>
                <option>Unit 5</option>
                <option>Unit 6</option>
                <option>Unit 7</option>
                <option>Unit 8</option>
                <option>Unit 9</option>
                <option>Unit 10</option>
              </select>
            </div>

            {/* Grade */}
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

            {/* Atelier — 15 explicit options */}
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

            {/* Status */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Status</label>
              <select
                value={form.status || "Draft"}
                onChange={(e) => setForm((x) => ({ ...x, status: e.target.value as "Published" | "Draft" }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          {/* Questions */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
              Questions ({questions.length})
            </div>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Q{qi + 1}</span>
                  <button onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
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
            ))}

            {/* Add question */}
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "14px", border: "1px solid #dbeafe" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 10 }}>+ New Question</div>
              <input
                value={newQ.text}
                onChange={(e) => setNewQ((q) => ({ ...q, text: e.target.value }))}
                placeholder="Question text"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #bfdbfe", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {newQ.options.map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <input type="radio" checked={newQ.correct === oi} onChange={() => setNewQ((q) => ({ ...q, correct: oi }))} />
                    <input
                      value={opt}
                      onChange={(e) => setNewQ((q) => ({ ...q, options: q.options.map((o, i) => i === oi ? e.target.value : o) }))}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #bfdbfe", fontSize: 12, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={addQuestion}
                style={{ marginTop: 8, padding: "7px 14px", borderRadius: 7, border: "none", background: "#3b82f6", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Add Question
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, position: "sticky", bottom: 0, background: "white" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
          <button onClick={() => onSave({ ...form, questions })}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<Partial<Assessment> | null>(null);

  const filtered = assessments.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.unit.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === "All Grades" || a.grade === gradeFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  const handleSave = (data: Partial<Assessment>) => {
    if (!data.id) {
      setAssessments((prev) => [...prev, { ...data, id: Date.now(), created: new Date().toISOString().slice(0, 10) } as Assessment]);
    } else {
      setAssessments((prev) => prev.map((a) => a.id === data.id ? { ...a, ...data } as Assessment : a));
    }
    setModal(null);
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Assessments</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {assessments.filter(a => a.status === "Published").length} published · {assessments.filter(a => a.status === "Draft").length} drafts
            </p>
          </div>
          <button
            onClick={() => setModal({ status: "Draft", grade: "Kindergarten", unit: "Unit 1", atelier: 1, questions: [] })}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> New Assessment
          </button>
        </div>

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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map((a) => (
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
                {a.unit} · Atelier {a.atelier} · {a.grade}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f8fafc" }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {a.questions.length} question{a.questions.length !== 1 ? "s" : ""} · {a.created}
                </span>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => setAssessments((prev) => [...prev, { ...a, id: Date.now(), title: `${a.title} (copy)`, status: "Draft" }])}
                    style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                  >
                    <Copy size={12} color="#64748b" />
                  </button>
                  <button
                    onClick={() => setModal(a)}
                    style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                  >
                    <Edit2 size={12} color="#64748b" />
                  </button>
                  <button
                    onClick={() => setAssessments((prev) => prev.filter((x) => x.id !== a.id))}
                    style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer" }}
                  >
                    <Trash2 size={12} color="#ef4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No assessments found.</div>
        )}
      </div>
      {modal && <AssessmentModal assessment={modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </AdminLayout>
  );
}
