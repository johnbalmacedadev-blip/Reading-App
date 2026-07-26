import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Trash2, X, Loader2, Users, Save } from "lucide-react";
import {
  adminClassTypesApi,
  type AdminClassTypePayload,
  type AdminClassTypeRecord,
} from "../../api/client";

type ClassTypeForm = {
  id?: number;
  code: string;
  name: string;
  name_fr: string;
  assessment_grade: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = (): ClassTypeForm => ({
  code: "",
  name: "",
  name_fr: "",
  assessment_grade: "Kindergarten",
  sort_order: 0,
  is_active: true,
});

function fromRecord(item: AdminClassTypeRecord): ClassTypeForm {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    name_fr: item.name_fr ?? "",
    assessment_grade: item.assessment_grade,
    sort_order: item.sort_order,
    is_active: item.is_active,
  };
}

function Modal({
  mode,
  initialForm,
  assessmentGrades,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialForm: ClassTypeForm;
  assessmentGrades: string[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: ClassTypeForm) => void;
}) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const set = <K extends keyof ClassTypeForm>(key: K, value: ClassTypeForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
            {mode === "create" ? "Add class type" : "Edit class type"}
          </h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Code
            <input
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="JK"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Name (English)
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Junior Kindergarten (JK)"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Name (French)
            <input
              value={form.name_fr}
              onChange={(e) => set("name_fr", e.target.value)}
              placeholder="Maternelle junior (JK)"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Assessment mapping
            <select
              value={form.assessment_grade}
              onChange={(e) => set("assessment_grade", e.target.value)}
              style={inputStyle}
            >
              {assessmentGrades.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
              Sort order
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, fontSize: 13, fontWeight: 600, color: "#334155" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Active
            </label>
          </div>
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button
            type="button"
            disabled={saving || !form.code.trim() || !form.name.trim()}
            onClick={() => onSave(form)}
            style={{
              ...primaryBtnStyle,
              opacity: saving || !form.code.trim() || !form.name.trim() ? 0.6 : 1,
            }}
          >
            {saving ? <Loader2 size={15} className="spin" /> : null}
            {mode === "create" ? "Add class" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#004aad",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryBtnStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export function AdminClassesPage() {
  const [types, setTypes] = useState<AdminClassTypeRecord[]>([]);
  const [assessmentGrades, setAssessmentGrades] = useState<string[]>([
    "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 3+",
  ]);
  const [maxStudents, setMaxStudents] = useState(30);
  const [maxStudentsDraft, setMaxStudentsDraft] = useState("30");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalForm, setModalForm] = useState<ClassTypeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminClassTypesApi.list();
      setTypes(result.class_types);
      setAssessmentGrades(result.assessment_grades);
      setMaxStudents(result.max_students_per_teacher);
      setMaxStudentsDraft(String(result.max_students_per_teacher));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load class types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setModalMode("create");
    setModalForm({
      ...emptyForm(),
      sort_order: types.length > 0 ? Math.max(...types.map((t) => t.sort_order)) + 1 : 1,
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item: AdminClassTypeRecord) => {
    setModalMode("edit");
    setModalForm(fromRecord(item));
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (form: ClassTypeForm) => {
    setSaving(true);
    setError("");
    const payload: AdminClassTypePayload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      name_fr: form.name_fr.trim() || null,
      assessment_grade: form.assessment_grade,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    try {
      if (modalMode === "create") {
        await adminClassTypesApi.create(payload);
        toast.success("Class type added.");
      } else if (form.id) {
        await adminClassTypesApi.update(form.id, payload);
        toast.success("Class type updated.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AdminClassTypeRecord) => {
    if (!window.confirm(`Delete class type "${item.name}"?`)) return;
    setDeletingId(item.id);
    try {
      await adminClassTypesApi.destroy(item.id);
      toast.success("Class type deleted.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveLimit = async () => {
    const value = Number.parseInt(maxStudentsDraft, 10);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid maximum of at least 1.");
      return;
    }
    setSavingLimit(true);
    try {
      const result = await adminClassTypesApi.updateLimit(value);
      setMaxStudents(result.max_students_per_teacher);
      setMaxStudentsDraft(String(result.max_students_per_teacher));
      toast.success("Student limit saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save limit.");
    } finally {
      setSavingLimit(false);
    }
  };

  const filtered = types.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.name_fr ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: "#0f172a" }}>Classes</h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              Manage class types teachers can select, and the max students for Free and Essentials plans (Insights has no limit).
            </p>
          </div>
          <button type="button" onClick={openCreate} style={primaryBtnStyle}>
            <Plus size={16} />
            Add class type
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Users size={18} color="#004aad" />
            <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Max students per teacher</h2>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            Applies to Free and Essentials teachers only. Insights subscriptions have no student limit.
            Default is 30. When reached, adding students is disabled for those plans.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              type="number"
              min={1}
              max={999}
              value={maxStudentsDraft}
              onChange={(e) => setMaxStudentsDraft(e.target.value)}
              style={{ ...inputStyle, width: 120 }}
            />
            <button type="button" onClick={handleSaveLimit} disabled={savingLimit} style={primaryBtnStyle}>
              {savingLimit ? <Loader2 size={15} /> : <Save size={15} />}
              Save limit
            </button>
            <span style={{ fontSize: 13, color: "#64748b" }}>Current: {maxStudents}</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search class types…"
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No class types found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {["Order", "Code", "Name", "French", "Assessment", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{item.sort_order}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.code}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#0f172a" }}>{item.name}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{item.name_fr || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#334155" }}>{item.assessment_grade}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: item.is_active ? "#ecfdf5" : "#f1f5f9",
                        color: item.is_active ? "#047857" : "#64748b",
                      }}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button type="button" onClick={() => openEdit(item)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        style={{ ...iconBtnStyle, color: "#dc2626" }}
                        title="Delete"
                      >
                        {deletingId === item.id ? <Loader2 size={15} /> : <Trash2 size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          mode={modalMode}
          initialForm={modalForm}
          assessmentGrades={assessmentGrades}
          saving={saving}
          error={error}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}

const iconBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 6,
  color: "#64748b",
};
