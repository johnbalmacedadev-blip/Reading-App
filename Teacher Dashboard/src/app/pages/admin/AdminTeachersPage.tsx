import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Plus, Search, Edit2, Archive, X, ChevronDown, User, Mail, Phone, Loader2, Eye, EyeOff,
} from "lucide-react";
import {
  adminTeachersApi,
  adminSchoolBoardsApi,
  type AdminSchool,
  type AdminTeacherPayload,
  type AdminTeacherRecord,
} from "../../api/client";

const TITLES = ["Mr.", "Mrs.", "Mme", "M."];
const STATUSES = ["Active", "Inactive", "Archived"];

const statusColors: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#ecfdf5", color: "#059669" },
  Inactive: { bg: "#fffbeb", color: "#d97706" },
  Archived: { bg: "#f8fafc", color: "#94a3b8" },
};

function TeacherAvatar({ teacher, initials }: { teacher: AdminTeacherRecord; initials: string }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = teacher.has_avatar && !failed;

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: showPhoto ? "transparent" : "linear-gradient(135deg, #dff3ff, #004aad22)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {showPhoto ? (
        <img
          src={adminTeachersApi.avatarUrl(teacher.id)}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700, color: "#004aad" }}>{initials}</span>
      )}
    </div>
  );
}

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

type BoardOption = { code: string; name: string };

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
  portal_username: string;
  portal_password: string;
};

const emptyForm = (schoolId = 0, defaultBoard = "CSDM"): FormState => ({
  title: "Mrs.",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  school_id: schoolId,
  board: defaultBoard,
  status: "Active",
  since: new Date().toISOString().slice(0, 10),
  portal_username: "",
  portal_password: "",
});

function toPayload(form: FormState, isCreate: boolean): AdminTeacherPayload {
  const payload: AdminTeacherPayload = {
    title: form.title || undefined,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: form.phone.trim() || undefined,
    school_id: form.school_id > 0 ? form.school_id : null,
    school_board: form.board || null,
    account_status: form.status,
    started_at: form.since || undefined,
    portal_username: form.portal_username.trim(),
  };
  if (isCreate || form.portal_password.trim()) {
    payload.portal_password = form.portal_password.trim();
  }
  return payload;
}

function fromRecord(teacher: AdminTeacherRecord): FormState {
  const username = teacher.portal_username ?? teacher.email;
  return {
    id: teacher.id,
    title: teacher.title || "Mrs.",
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    email: username,
    phone: teacher.phone,
    school_id: teacher.school_id ?? 0,
    board: teacher.board ?? "",
    status: teacher.status,
    since: teacher.since,
    portal_username: username,
    portal_password: teacher.portal_password ?? "",
  };
}

function TeacherModal({
  mode,
  initialForm,
  schools,
  boardOptions,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialForm: FormState;
  schools: AdminSchool[];
  boardOptions: BoardOption[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: FormState) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [suggesting, setSuggesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isCreate = mode === "create";

  useEffect(() => {
    setForm(initialForm);
    setShowPassword(false);
  }, [initialForm]);

  const suggestCredentials = useCallback(async (firstName: string, lastName: string, board: string) => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSuggesting(true);
    try {
      const creds = await adminTeachersApi.suggestCredentials(firstName.trim(), lastName.trim(), board);
      setForm((f) => ({
        ...f,
        portal_username: creds.portal_username,
        email: creds.portal_username,
        portal_password: isCreate ? creds.portal_password : f.portal_password,
      }));
    } catch {
      // keep manual values
    } finally {
      setSuggesting(false);
    }
  }, [isCreate]);

  useEffect(() => {
    if (isCreate && form.first_name.trim() && form.last_name.trim()) {
      const timer = setTimeout(() => {
        suggestCredentials(form.first_name, form.last_name, form.board);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [form.first_name, form.last_name, form.board, isCreate, suggestCredentials]);
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
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                style={plainInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                style={plainInputStyle}
              />
            </div>
          </div>

          {[
            { label: "Email", key: "email" as const, icon: Mail, placeholder: "firstname.lastname@board.qc.ca" },
            { label: "Phone", key: "phone" as const, icon: Phone, placeholder: "514-555-0000" },
          ].map((field) => (
            <div key={field.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{field.label}</label>
              <div style={{ position: "relative" }}>
                <field.icon size={14} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={form[field.key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: value,
                      ...(field.key === "email" ? { portal_username: value } : {}),
                    }));
                  }}
                  placeholder={field.placeholder}
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
                if (!e.target.value) {
                  setForm((prev) => ({ ...prev, school_id: 0 }));
                  return;
                }
                const schoolId = Number(e.target.value);
                const school = schools.find((s) => s.id === schoolId);
                setForm((prev) => ({
                  ...prev,
                  school_id: schoolId,
                  board: school ? schoolBoardMap[school.name] ?? prev.board : prev.board,
                }));
              }}
              style={plainInputStyle}
            >
              <option value="">NONE</option>
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
                onChange={(e) => setForm((prev) => ({ ...prev, board: e.target.value }))}
                style={plainInputStyle}
              >
                <option value="">NONE</option>
                {boardOptions.map((b) => (
                  <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Start Date</label>
              <input
                type="date"
                value={form.since}
                onChange={(e) => setForm((prev) => ({ ...prev, since: e.target.value }))}
                style={plainInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              style={plainInputStyle}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: "0 0 12px" }}>
              Teacher portal login
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Username</label>
                  <button
                    type="button"
                    onClick={() => suggestCredentials(form.first_name, form.last_name, form.board)}
                    disabled={suggesting || !form.first_name.trim() || !form.last_name.trim()}
                    style={{ fontSize: 11, color: "#004aad", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {suggesting ? "Suggesting…" : "Auto-suggest"}
                  </button>
                </div>
                <input
                  value={form.portal_username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({ ...prev, portal_username: value, email: value }));
                  }}
                  placeholder="teacher.name@portal.local"
                  style={plainInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                  Password {isCreate ? "" : "(leave blank to keep current)"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.portal_password}
                    onChange={(e) => setForm((prev) => ({ ...prev, portal_password: e.target.value }))}
                    placeholder={isCreate ? "Auto-generated password" : "Saved portal password"}
                    style={{ ...plainInputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
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
            onClick={() => onSave(form)}
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
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
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
      const [teachersRes, schoolsRes, boardsRes] = await Promise.all([
        adminTeachersApi.list(),
        adminTeachersApi.schools(),
        adminSchoolBoardsApi.list({ status: "Active" }),
      ]);
      setTeachers(teachersRes.teachers);
      setSchools(schoolsRes.schools);
      setBoardOptions(
        boardsRes.boards.map((b) => ({ code: b.code, name: b.name })).sort((a, b) => a.name.localeCompare(b.name))
      );
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
    setForm(emptyForm(schools[0]?.id ?? 0, boardOptions[0]?.code ?? "CSDM"));
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

  const handleSave = async (form: FormState) => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setModalError("First and last name are required.");
      return;
    }
    if (!form.portal_username.trim()) {
      setModalError("Portal username is required.");
      return;
    }
    if (modalMode === "create" && !form.portal_password.trim()) {
      setModalError("Portal password is required.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const payload = toPayload(form, modalMode === "create");
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
                  {["Teacher", "Email", "School", "Board", "Classes", "Students", "Status", "Actions"].map((h) => (
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
                          <TeacherAvatar teacher={t} initials={initials(t.name)} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{t.email}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: t.school ? "#374151" : "#94a3b8" }}>
                        {t.school || "None"}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: t.board ? "#dff3ff" : "#f1f5f9",
                            color: t.board ? "#004aad" : "#94a3b8",
                          }}
                        >
                          {t.board || "None"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{t.classes}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{t.students}</td>
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
          initialForm={form}
          schools={schools}
          boardOptions={boardOptions}
          saving={saving}
          error={modalError}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
