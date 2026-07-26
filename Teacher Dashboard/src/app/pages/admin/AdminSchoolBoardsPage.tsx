import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Archive, X, ChevronDown, Building2, Loader2, Eye, EyeOff } from "lucide-react";
import {
  adminSchoolBoardsApi,
  type AdminSchoolBoardPayload,
  type AdminSchoolBoardRecord,
} from "../../api/client";

type BoardForm = {
  id?: number;
  name: string;
  code: string;
  status: string;
  portal_username: string;
  portal_password: string;
};

const emptyForm = (): BoardForm => ({
  name: "",
  code: "",
  status: "Active",
  portal_username: "",
  portal_password: "",
});

function fromRecord(board: AdminSchoolBoardRecord): BoardForm {
  return {
    id: board.id,
    name: board.name,
    code: board.code,
    status: board.status,
    portal_username: board.portal_username ?? "",
    portal_password: board.portal_password ?? "",
  };
}

function toPayload(form: BoardForm, isCreate: boolean): AdminSchoolBoardPayload {
  const payload: AdminSchoolBoardPayload = {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    status: form.status,
    portal_username: form.portal_username.trim(),
  };
  if (isCreate || form.portal_password.trim()) {
    payload.portal_password = form.portal_password.trim();
  }
  return payload;
}

function Modal({
  mode,
  initialForm,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialForm: BoardForm;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: BoardForm) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [suggesting, setSuggesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const isCreate = mode === "create";

  useEffect(() => {
    setForm(initialForm);
    setShowPassword(false);
  }, [initialForm]);

  const suggestCredentials = useCallback(async (name: string, code: string) => {
    if (!name.trim()) return;
    setSuggesting(true);
    try {
      const creds = await adminSchoolBoardsApi.suggestCredentials(
        name.trim(),
        code.trim().toUpperCase() || "BOARD"
      );
      setForm((f) => ({
        ...f,
        portal_username: creds.portal_username,
        portal_password: isCreate ? creds.portal_password : f.portal_password,
      }));
    } catch {
      // keep manual values
    } finally {
      setSuggesting(false);
    }
  }, [isCreate]);

  const loadPassword = useCallback(async () => {
    if (isCreate || !form.id || form.portal_password.trim()) return true;
    setLoadingPassword(true);
    try {
      const { board } = await adminSchoolBoardsApi.get(form.id);
      setForm((f) => ({ ...f, portal_password: board.portal_password ?? "" }));
      return true;
    } catch {
      return false;
    } finally {
      setLoadingPassword(false);
    }
  }, [form.id, form.portal_password, isCreate]);

  const togglePasswordVisibility = useCallback(async () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }
    if (!form.portal_password.trim() && form.id) {
      const loaded = await loadPassword();
      if (!loaded) return;
    }
    setShowPassword(true);
  }, [showPassword, form.portal_password, form.id, loadPassword]);

  useEffect(() => {
    if (isCreate && form.name.trim()) {
      const timer = setTimeout(() => {
        suggestCredentials(form.name, form.code);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [form.name, form.code, isCreate, suggestCredentials]);

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>
            {mode === "create" ? "New School Board" : "Edit Board"}
          </h2>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Board Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Montreal School Board (CSDM)"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., CSDM"
              readOnly={mode === "edit"}
              style={{ ...inputStyle, ...(mode === "edit" ? { background: "#f8fafc", color: "#64748b" } : {}) }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              style={inputStyle}
            >
              <option>Active</option>
              <option>Archived</option>
            </select>
          </div>

          <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: "0 0 12px" }}>
              School board portal login
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Username</label>
                  <button
                    type="button"
                    onClick={() => suggestCredentials(form.name, form.code)}
                    disabled={suggesting || !form.name.trim()}
                    style={{ fontSize: 11, color: "#004aad", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {suggesting ? "Suggesting…" : "Auto-suggest"}
                  </button>
                </div>
                <input
                  value={form.portal_username}
                  onChange={(e) => setForm((f) => ({ ...f, portal_username: e.target.value }))}
                  placeholder="board.portal@portal.local"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Password {isCreate ? "" : "(leave blank to keep current)"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.portal_password}
                    onChange={(e) => setForm((f) => ({ ...f, portal_password: e.target.value }))}
                    placeholder={isCreate ? "Auto-generated password" : "Saved portal password"}
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={loadingPassword}
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
                    {loadingPassword ? <Loader2 size={16} className="animate-spin" /> : showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
          <button
            type="button"
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

export function AdminSchoolBoardsPage() {
  const [boards, setBoards] = useState<AdminSchoolBoardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<BoardForm>(emptyForm());
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { boards: data } = await adminSchoolBoardsApi.list({
        search: search || undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
      });
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load school boards.");
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadBoards, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadBoards, search]);

  const activeCount = boards.filter((b) => b.status === "Active").length;

  const openCreate = () => {
    setForm(emptyForm());
    setModalError("");
    setModalMode("create");
  };

  const openEdit = async (board: AdminSchoolBoardRecord) => {
    setForm(fromRecord(board));
    setModalError("");
    setModalMode("edit");
    setLoadingBoard(true);
    try {
      const { board: full } = await adminSchoolBoardsApi.get(board.id);
      setForm(fromRecord(full));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load board details.");
    } finally {
      setLoadingBoard(false);
    }
  };

  const closeModal = () => {
    if (!saving) setModalMode(null);
  };

  const handleSave = async (form: BoardForm) => {
    if (!form.name.trim()) {
      setModalError("Board name is required.");
      return;
    }
    if (!form.code.trim()) {
      setModalError("Board code is required.");
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
        const { board } = await adminSchoolBoardsApi.create(payload);
        setBoards((prev) => [...prev, board].sort((a, b) => a.name.localeCompare(b.name)));
      } else if (modalMode === "edit" && form.id) {
        const { board } = await adminSchoolBoardsApi.update(form.id, payload);
        setBoards((prev) => prev.map((b) => (b.id === board.id ? board : b)));
      }
      setModalMode(null);
      loadBoards();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: number) => {
    setArchivingId(id);
    try {
      const { board } = await adminSchoolBoardsApi.archive(id);
      setBoards((prev) => prev.map((b) => (b.id === board.id ? board : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed.");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>School Boards</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {loading ? "Loading…" : `${activeCount} active boards`}
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> New Board
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={loadBoards} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
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
              placeholder="Search for a board..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: statusFilter, onChange: setStatusFilter, options: ["All", "Active", "Archived"] },
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
              <Loader2 size={18} className="animate-spin" /> Loading boards…
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["School Board", "Schools", "Teachers", "Students", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boards.map((b, i) => (
                  <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: "#dff3ff", borderRadius: 8, padding: 7, flexShrink: 0 }}>
                          <Building2 size={14} color="#004aad" />
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", display: "block" }}>{b.name}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{b.code}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.schools}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.teachers}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.students.toLocaleString("en-US")}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                        background: b.status === "Active" ? "#ecfdf5" : "#f8fafc",
                        color: b.status === "Active" ? "#059669" : "#94a3b8",
                      }}>{b.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(b)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleArchive(b.id)}
                          disabled={archivingId === b.id}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444" }}
                        >
                          {archivingId === b.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Archive size={12} />
                          )}
                          {b.status === "Archived" ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && boards.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No board found.</div>
          )}
        </div>
      </div>

      {modalMode && (
        <Modal
          mode={modalMode}
          initialForm={form}
          saving={saving || loadingBoard}
          error={modalError}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
