import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Search, Edit2, X, ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Eye, Plus, Trash2, Loader2,
} from "lucide-react";
import { useLanguage } from "../../i18n";
import {
  adminStudentsApi,
  type AdminGradeOption,
  type AdminSchool,
  type AdminStudentPayload,
  type AdminStudentRecord,
  type AdminStudentTeacher,
} from "../../api/client";

const statusConfig: Record<string, { bg: string; color: string }> = {
  "On Track": { bg: "#ecfdf5", color: "#059669" },
  "Monitor": { bg: "#fffbeb", color: "#d97706" },
  "At Risk": { bg: "#fff1f2", color: "#e11d48" },
};

const STATUSES = ["On Track", "Monitor", "At Risk"];
const PAGE_SIZE = 20;
const NONE_LABEL = "None";

type FormState = {
  id?: number;
  first_name: string;
  last_name: string;
  dob: string;
  grade: string;
  school_id: number | null;
  board: string;
  teacher: string;
  atelier: number;
  status: string;
};

const emptyForm = (grade = ""): FormState => ({
  first_name: "",
  last_name: "",
  dob: "",
  grade,
  school_id: null,
  board: "",
  teacher: "",
  atelier: 1,
  status: "On Track",
});

function toPayload(form: FormState): AdminStudentPayload {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    date_of_birth: form.dob || undefined,
    grade: form.grade,
    school_id: form.school_id,
    teacher_name: form.teacher.trim(),
    current_atelier: form.atelier,
    status: form.status,
  };
}

function fromRecord(student: AdminStudentRecord, schools: AdminSchool[]): FormState {
  return {
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    dob: student.dob,
    grade: student.grade,
    school_id: student.school_id,
    board: schools.find((s) => s.id === student.school_id)?.board ?? "",
    teacher: student.teacher,
    atelier: student.atelier,
    status: student.status,
  };
}

function StudentModal({
  mode,
  form,
  schools,
  grades,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "add" | "edit" | "view";
  form: FormState;
  schools: AdminSchool[];
  grades: AdminGradeOption[];
  saving: boolean;
  error: string;
  onChange: (form: FormState) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const { t, tp } = useLanguage();
  const readOnly = mode === "view";
  const [teacherResults, setTeacherResults] = useState<AdminStudentTeacher[]>([]);
  const [teacherSearching, setTeacherSearching] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);

  useEffect(() => {
    if (readOnly || !teacherOpen) return;
    const term = form.teacher.trim();
    const timer = setTimeout(async () => {
      setTeacherSearching(true);
      try {
        const { teachers } = await adminStudentsApi.teachers(term);
        setTeacherResults(teachers);
      } catch {
        setTeacherResults([]);
      } finally {
        setTeacherSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [form.teacher, teacherOpen, readOnly]);

  const selectTeacher = (teacher: AdminStudentTeacher) => {
    onChange({
      ...form,
      teacher: teacher.name,
      school_id: teacher.school_id,
      board: teacher.board,
    });
    setTeacherOpen(false);
  };

  const gradeOptions = grades.some((g) => g.value === form.grade) || !form.grade
    ? grades
    : [{ value: form.grade, label: form.grade, label_fr: form.grade, assessment_grade: form.grade, target: 14 }, ...grades];

  const expected = grades.find((g) => g.value === form.grade)?.target ?? 0;
  const progress = expected > 0 ? Math.min(100, Math.round((form.atelier / expected) * 100)) : 0;
  const title =
    mode === "add"
      ? "Add Student Record"
      : `Record — ${form.first_name} ${form.last_name}`.trim();

  const field = (label: string, children: ReactNode) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
    background: readOnly ? "#f8fafc" : "white",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>{title}</h2>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {mode !== "add" && (
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>SML Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#004aad" }}>
                  {tp("admin.workshopProgress", { current: form.atelier, expected })}
                </span>
              </div>
              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: progress >= 100 ? "#c9e265" : progress >= 70 ? "#38b6ff" : "#ff5757",
                    borderRadius: 4,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{tp("evaluation.workshopN", { n: 1 })}</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{progress}% of target</span>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {field(
              "First Name",
              <input
                readOnly={readOnly}
                value={form.first_name}
                onChange={(e) => onChange({ ...form, first_name: e.target.value })}
                style={inputStyle}
              />
            )}
            {field(
              "Last Name",
              <input
                readOnly={readOnly}
                value={form.last_name}
                onChange={(e) => onChange({ ...form, last_name: e.target.value })}
                style={inputStyle}
              />
            )}
            {field(
              "Date of Birth",
              <input
                readOnly={readOnly}
                type="date"
                value={form.dob}
                onChange={(e) => onChange({ ...form, dob: e.target.value })}
                style={inputStyle}
              />
            )}
            {field(
              "Grade Level",
              readOnly ? (
                <input readOnly value={form.grade} style={inputStyle} />
              ) : (
                <select
                  value={form.grade}
                  onChange={(e) => onChange({ ...form, grade: e.target.value })}
                  style={inputStyle}
                >
                  <option value="" disabled>Select grade</option>
                  {gradeOptions.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              )
            )}
            {field(
              t("admin.currentWorkshop"),
              <input
                readOnly={readOnly}
                type="number"
                min={1}
                max={15}
                value={form.atelier}
                onChange={(e) => onChange({ ...form, atelier: parseInt(e.target.value, 10) || 1 })}
                style={inputStyle}
              />
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              {field(
                "Teacher",
                readOnly ? (
                  <input readOnly value={form.teacher || NONE_LABEL} style={inputStyle} />
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      value={form.teacher}
                      placeholder="Search a teacher by name or email…"
                      onFocus={() => setTeacherOpen(true)}
                      onChange={(e) => {
                        onChange({ ...form, teacher: e.target.value });
                        setTeacherOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setTeacherOpen(false), 150)}
                      style={inputStyle}
                    />
                    {teacherOpen && (
                      <div
                        style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 5,
                          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
                          boxShadow: "0 10px 30px rgba(15,23,42,0.12)", maxHeight: 210, overflowY: "auto",
                        }}
                      >
                        {teacherSearching && (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                            <Loader2 size={12} className="animate-spin" /> Searching teachers…
                          </div>
                        )}
                        {!teacherSearching && teacherResults.length === 0 && (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8" }}>
                            No teacher found.
                          </div>
                        )}
                        {!teacherSearching &&
                          teacherResults.map((teacher) => (
                            <button
                              key={teacher.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectTeacher(teacher)}
                              style={{
                                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                                background: "white", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{teacher.name}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                {teacher.email} · {teacher.school || NONE_LABEL} · {teacher.board || NONE_LABEL}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            {field(
              "School",
              readOnly ? (
                <input
                  readOnly
                  value={schools.find((s) => s.id === form.school_id)?.name ?? NONE_LABEL}
                  style={inputStyle}
                />
              ) : (
                <select
                  value={form.school_id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    onChange({
                      ...form,
                      school_id: id,
                      board: schools.find((s) => s.id === id)?.board ?? "",
                    });
                  }}
                  style={inputStyle}
                >
                  <option value="">{NONE_LABEL}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )
            )}
            {field(
              "School Board",
              <input
                readOnly
                value={schools.find((s) => s.id === form.school_id)?.board || form.board || NONE_LABEL}
                style={{ ...inputStyle, background: "#f8fafc" }}
              />
            )}
            {field(
              "Status",
              readOnly ? (
                <input readOnly value={form.status} style={inputStyle} />
              ) : (
                <select
                  value={form.status}
                  onChange={(e) => onChange({ ...form, status: e.target.value })}
                  style={inputStyle}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )
            )}
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            {mode === "edit" && onDelete && (
              <button
                onClick={onDelete}
                disabled={saving}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #fee2e2", background: "#fff5f5", fontSize: 13, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button
                onClick={onSave}
                disabled={saving}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {mode === "add" ? "Add Record" : "Save"}
              </button>
            )}
            {readOnly && (
              <button
                onClick={onSave}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminStudentsPage() {
  const { auto: a, t, tp } = useLanguage();
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [grades, setGrades] = useState<AdminGradeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [studentsRes, schoolsRes] = await Promise.all([
        adminStudentsApi.list(),
        adminStudentsApi.schools(),
      ]);
      setStudents(studentsRes.students);
      setSchools(schoolsRes.schools);
      setGrades(schoolsRes.grades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student records.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, gradeFilter, statusFilter]);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.school.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === "All Grades" || s.grade === gradeFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  const gradeFilterOptions = useMemo(() => {
    const values = grades.map((g) => g.value);
    students.forEach((s) => {
      if (s.grade && !values.includes(s.grade)) values.push(s.grade);
    });
    return ["All Grades", ...values];
  }, [grades, students]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

  const stats = {
    total: students.length,
    enVoie: students.filter((s) => s.status === "On Track").length,
    surveiller: students.filter((s) => s.status === "Monitor").length,
    risque: students.filter((s) => s.status === "At Risk").length,
  };

  const openAdd = () => {
    setForm(emptyForm(grades[0]?.value ?? ""));
    setModalError("");
    setModalMode("add");
  };

  const openView = (student: AdminStudentRecord) => {
    setForm(fromRecord(student, schools));
    setModalError("");
    setModalMode("view");
  };

  const openEdit = (student: AdminStudentRecord) => {
    setForm(fromRecord(student, schools));
    setModalError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    if (!saving) setModalMode(null);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setModalError("First and last name are required.");
      return;
    }
    if (!form.grade) {
      setModalError("Please select a grade level.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const payload = toPayload(form);
      if (modalMode === "add") {
        const { student } = await adminStudentsApi.create(payload);
        setStudents((prev) => [...prev, student].sort((x, y) => x.name.localeCompare(y.name)));
      } else if (modalMode === "edit" && form.id) {
        const { student } = await adminStudentsApi.update(form.id, payload);
        setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
      }
      setModalMode(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id || !window.confirm("Delete this student record permanently?")) return;

    setSaving(true);
    setModalError("");
    try {
      await adminStudentsApi.remove(form.id);
      setStudents((prev) => prev.filter((s) => s.id !== form.id));
      setModalMode(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDelete = async (id: number) => {
    if (!window.confirm("Delete this student record permanently?")) return;
    setDeletingId(id);
    try {
      await adminStudentsApi.remove(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Student Records</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              Assessment records tracking — students don&apos;t have platform accounts
            </p>
          </div>
          <button
            onClick={openAdd}
            disabled={loading || grades.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Record
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={loadData} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
              Retry
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Records", value: loading ? "—" : stats.total, color: "#004aad", bg: "#dff3ff" },
            { label: "On Track", value: loading ? "—" : stats.enVoie, color: "#059669", bg: "#ecfdf5" },
            { label: "Monitor", value: loading ? "—" : stats.surveiller, color: "#d97706", bg: "#fffbeb" },
            { label: "At Risk", value: loading ? "—" : stats.risque, color: "#e11d48", bg: "#fff1f2" },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or school..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: gradeFilter, onChange: setGradeFilter, options: gradeFilterOptions },
            { value: statusFilter, onChange: setStatusFilter, options: ["All", ...STATUSES] },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}
              >
                {sel.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Loader2 size={18} className="animate-spin" /> Loading student records…
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Student", "Grade", "School", "Teacher", t("admin.currentWorkshop"), "Target", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const sc = statusConfig[s.status] ?? statusConfig["On Track"];
                  const expected = s.target || 14;
                  return (
                    <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0f7ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <GraduationCap size={14} color="#38b6ff" />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>{a(s.grade)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>{s.school ? a(s.school) : NONE_LABEL}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>{s.teacher ? a(s.teacher) : NONE_LABEL}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#004aad" }}>{s.atelier}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>{expected}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: sc.bg, color: sc.color }}>
                          {a(s.status)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openView(s)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #dbeafe", background: "#eff6ff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#3b82f6" }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleQuickDelete(s.id)}
                            disabled={deletingId === s.id}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444" }}
                          >
                            {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafbfc",
            }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Showing {showingFrom}–{showingTo} of {filtered.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0",
                    background: "white", fontSize: 12, color: "#374151",
                    cursor: safePage <= 1 ? "not-allowed" : "pointer",
                    opacity: safePage <= 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span style={{ fontSize: 12, color: "#64748b", minWidth: 90, textAlign: "center" }}>
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0",
                    background: "white", fontSize: 12, color: "#374151",
                    cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                    opacity: safePage >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No record found.</div>
          )}
        </div>
      </div>

      {modalMode && (
        <StudentModal
          mode={modalMode}
          form={form}
          schools={schools}
          grades={grades}
          saving={saving}
          error={modalError}
          onChange={setForm}
          onClose={closeModal}
          onSave={
            modalMode === "view"
              ? () => setModalMode("edit")
              : handleSave
          }
          onDelete={modalMode === "edit" ? handleDelete : undefined}
        />
      )}
    </AdminLayout>
  );
}
