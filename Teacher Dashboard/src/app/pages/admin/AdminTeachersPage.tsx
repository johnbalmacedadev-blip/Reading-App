import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Plus, Search, Edit2, Archive, X, ChevronDown, User, Mail, Phone, Loader2,
} from "lucide-react";
import {
  adminTeachersApi,
  type AdminSchool,
  type AdminTeacherPayload,
  type AdminTeacherRecord,
} from "../../api/client";

const BOARDS = ["CSDM", "CSDN", "CSMB", "CSPO"];
const TITLES = ["Mr.", "Mrs.", "Mme", "M."];
const STATUSES = ["Active", "Inactive", "Archived"];

const statusColors: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#ecfdf5", color: "#059669" },
  Inactive: { bg: "#fffbeb", color: "#d97706" },
  Archived: { bg: "#f8fafc", color: "#94a3b8" },
};

const schoolBoardMap: Record<string, string> = {
  "École Saint-Laurent": "CSDM",
  "École des Érables": "CSDM",
  "École Saint-Joseph": "CSDM",
  "École Bois-de-Coulonge": "CSDN",
  "École des Sommets": "CSDN",
  "École Marguerite-d'Youville": "CSMB",
  "École du Ruisseau": "CSMB",
  "École des Pionniers": "CSPO",
};

type FormState = {
  id?: number;
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  school_id: number;
  board: string;
  status: string;
  since: string;
};

const emptyForm = (schoolId = 0): FormState => ({
  title: "Mrs.",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  school_id: schoolId,
  board: "CSDM",
  status: "Active",
  since: new Date().toISOString().slice(0, 10),
});

function toPayload(form: FormState): AdminTeacherPayload {
  return {
    title: form.title || undefined,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    school_id: form.school_id,
    school_board: form.board,
    account_status: form.status,
    started_at: form.since || undefined,
  };
}

function fromRecord(teacher: AdminTeacherRecord): FormState {
  return {
    id: teacher.id,
    title: teacher.title || "Mrs.",
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    email: teacher.email,
    phone: teacher.phone,
    school_id: teacher.school_id,
    board: teacher.board,
    status: teacher.status,
    since: teacher.since,
  };
}

function TeacherModal({
  mode,
  form,
  schools,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  form: FormState;
  schools: AdminSchool[];
  saving: boolean;
  error: string;
  onChange: (form: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const inputStyle = {
    width: "100%",
    padding: "9px 12px 9px 32px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const plainInputStyle = { ...inputStyle, padding: "9px 12px" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>
            {mode === "create" ? "New Teacher" : "Edit Teacher"}
          </h2>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Title</label>
              <select
                value={form.title}
                onChange={(e) => onChange({ ...form, title: e.target.value })}
                style={plainInputStyle}
              >
                {TITLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>First Name</label>
              <input
                value={form.first_name}
                onChange={(e) => onChange({ ...form, first_name: e.target.value })}
                style={plainInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => onChange({ ...form, last_name: e.target.value })}
                style={plainInputStyle}
              />
            </div>
          </div>

          {[
            { label: "Email", key: "email" as const, icon: Mail, placeholder: "firstname.lastname@board.qc.ca" },
            { label: "Phone", key: "phone" as const, icon: Phone, placeholder: "514-555-0000" },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{f.label}</label>
              <div style={{ position: "relative" }}>
                <f.icon size={14} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={form[f.key]}
                  onChange={(e) => onChange({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              </div>
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Assigned School</label>
            <select
              value={form.school_id || ""}
              onChange={(e) => {
                const schoolId = Number(e.target.value);
                const school = schools.find((s) => s.id === schoolId);
                onChange({
                  ...form,
                  school_id: schoolId,
                  board: school ? schoolBoardMap[school.name] ?? form.board : form.board,
                });
              }}
              style={plainInputStyle}
            >
              <option value="" disabled>Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>School Board</label>
              <select
                value={form.board}
                onChange={(e) => onChange({ ...form, board: e.target.value })}
                style={plainInputStyle}
              >
                {BOARDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Start Date</label>
              <input
                type="date"
                value={form.since}
                onChange={(e) => onChange({ ...form, since: e.target.value })}
                style={plainInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => onChange({ ...form, status: e.target.value })}
              style={plainInputStyle}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacherRecord[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("All Schools");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teachersRes, schoolsRes] = await Promise.all([
        adminTeachersApi.list(),
        adminTeachersApi.schools(),
      ]);
      setTeachers(teachersRes.teachers);
      setSchools(schoolsRes.schools);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teachers.");
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const schoolOptions = ["All Schools", ...schools.map((s) => s.name)];

  const filtered = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchSchool = schoolFilter === "All Schools" || t.school === schoolFilter;
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchSearch && matchSchool && matchStatus;
  });

  const activeCount = teachers.filter((t) => t.status === "Active").length;

  const openCreate = () => {
    setForm(emptyForm(schools[0]?.id ?? 0));
    setModalError("");
    setModalMode("create");
  };

  const openEdit = (teacher: AdminTeacherRecord) => {
    setForm(fromRecord(teacher));
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
    if (!form.email.trim()) {
      setModalError("Email is required.");
      return;
    }
    if (!form.school_id) {
      setModalError("Please select a school.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const payload = toPayload(form);
      if (modalMode === "create") {
        const { teacher } = await adminTeachersApi.create(payload);
        setTeachers((prev) => [...prev, teacher].sort((a, b) => a.name.localeCompare(b.name)));
      } else if (modalMode === "edit" && form.id) {
        const { teacher } = await adminTeachersApi.update(form.id, payload);
        setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
      }
      setModalMode(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: number) => {
    setArchivingId(id);
    try {
      const { teacher } = await adminTeachersApi.archive(id);
      setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed.");
    } finally {
      setArchivingId(null);
    }
  };

  const initials = (name: string) =>
    name.split(" ").filter((w) => /^[A-ZÀ-Ü]/.test(w)).slice(-1)[0]?.charAt(0) || "T";

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Teachers</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {loading ? "Loading…" : `${activeCount} active teachers`}
            </p>
          </div>
          <button
            onClick={openCreate}
            disabled={loading || schools.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> New Teacher
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

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a teacher..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: schoolFilter, onChange: setSchoolFilter, options: schoolOptions },
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
              <Loader2 size={18} className="animate-spin" /> Loading teachers…
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Teacher", "Email", "School", "Board", "Classes", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const sc = statusColors[t.status] || statusColors.Archived;
                  return (
                    <tr key={t.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #dff3ff, #004aad22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#004aad" }}>{initials(t.name)}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{t.email}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{t.school}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#dff3ff", color: "#004aad" }}>{t.board}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{t.classes}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: sc.bg, color: sc.color }}>{t.status}</span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(t)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleArchive(t.id)}
                            disabled={archivingId === t.id}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444" }}
                          >
                            {archivingId === t.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Archive size={12} />
                            )}
                            {t.status === "Archived" ? "Restore" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No teacher found.</div>
          )}
        </div>
      </div>

      {modalMode && (
        <TeacherModal
          mode={modalMode}
          form={form}
          schools={schools}
          saving={saving}
          error={modalError}
          onChange={setForm}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
