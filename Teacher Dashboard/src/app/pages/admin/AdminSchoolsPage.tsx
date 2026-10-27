import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Archive, Trash2, X, ChevronDown, School, Loader2, Eye, EyeOff } from "lucide-react";
import {
  adminSchoolsApi,
  adminSchoolBoardsApi,
  resourceAccessApi,
  type AdminSchoolPayload,
  type AdminSchoolRecord,
  type InstitutionalAccessMode,
  type InstitutionalBillingNoticeType,
} from "../../api/client";
import { ResourceAccessModal, ResourceAccessToggle } from "../../components/admin/ResourceAccessModal";
import {
  InstitutionalAccessFields,
  type InstitutionalAccessForm,
} from "../../components/admin/InstitutionalAccessFields";
import { ExtendTrialDaysModal } from "../../components/admin/ExtendTrialDaysModal";
import { CreateSchoolWizard } from "../../components/admin/CreateSchoolWizard";

type BoardOption = { code: string; name: string };

const NONE_BOARD: BoardOption = { code: "", name: "None" };

type SchoolForm = {
  id?: number;
  name: string;
  city: string;
  board: string;
  grades: string;
  portal_username: string;
  portal_password: string;
} & InstitutionalAccessForm;

function fromRecord(school: AdminSchoolRecord): SchoolForm {
  return {
    id: school.id,
    name: school.name,
    city: school.city,
    board: school.board || "",
    grades: school.grades === "—" ? "K–2" : school.grades,
    portal_username: school.portal_username ?? "",
    portal_password: school.portal_password ?? "",
    access_mode: (school.access_mode as InstitutionalAccessMode) || "trial",
    trial_started_at: school.trial_started_at ?? "",
    trial_ends_at: school.trial_ends_at ?? "",
    subscription_started_at: school.subscription_started_at ?? "",
    subscription_ends_at: school.subscription_ends_at ?? "",
    access: school.access,
    is_trial_active: school.is_trial_active,
    trial_days_remaining: school.trial_days_remaining,
    activation_pending: school.activation_pending,
  };
}

function modalBoardOptions(activeBoards: BoardOption[], currentBoard: string): BoardOption[] {
  const boards = [NONE_BOARD, ...activeBoards];
  if (currentBoard && !boards.some((b) => b.code === currentBoard)) {
    return [{ code: currentBoard, name: currentBoard }, ...boards];
  }
  return boards;
}

function Modal({
  title,
  school,
  isCreate,
  boardOptions,
  onClose,
  onSave,
  saving,
  onSendBillingNotice,
  billingNoticeAction,
  onExtendTrial,
  extendTrialAction,
  onResendActivation,
  onActivateAccount,
  activationAction,
}: {
  title: string;
  school: SchoolForm;
  isCreate: boolean;
  boardOptions: BoardOption[];
  onClose: () => void;
  onSave: (form: SchoolForm) => void;
  saving: boolean;
  onSendBillingNotice?: (type: InstitutionalBillingNoticeType) => void;
  billingNoticeAction: InstitutionalBillingNoticeType | null;
  onExtendTrial?: (days: number) => Promise<boolean>;
  extendTrialAction?: boolean;
  onResendActivation?: () => void;
  onActivateAccount?: () => void;
  activationAction: "resend" | "activate" | null;
}) {
  const [form, setForm] = useState(school);
  const [suggesting, setSuggesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [extendDaysOpen, setExtendDaysOpen] = useState(false);

  useEffect(() => {
    setForm(school);
    setShowPassword(false);
  }, [school]);

  const set = <K extends keyof SchoolForm>(key: K, value: SchoolForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const suggestCredentials = useCallback(async (name: string, board: string) => {
    if (!name.trim()) return;
    setSuggesting(true);
    try {
      const creds = await adminSchoolsApi.suggestCredentials(name.trim(), board);
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
      const { school: full } = await adminSchoolsApi.get(form.id);
      setForm((f) => ({ ...f, portal_password: full.portal_password ?? "" }));
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
        suggestCredentials(form.name, form.board);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [form.name, form.board, isCreate, suggestCredentials]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: 520,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 24px 16px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "School Name", key: "name" as const, placeholder: "e.g., École des Érables" },
            { label: "City", key: "city" as const, placeholder: "e.g., Montreal" },
          ].map((f) => (
            <div key={f.key}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                {f.label}
              </label>
              <input
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 5,
              }}
            >
              School Board
            </label>
            <select
              value={form.board}
              onChange={(e) => set("board", e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                outline: "none",
              }}
            >
              {boardOptions.map((b) => (
                <option key={b.code || "__none__"} value={b.code}>
                  {b.code ? `${b.name} (${b.code})` : b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 5,
              }}
            >
              Grade Levels
            </label>
            <input
              value={form.grades}
              onChange={(e) => set("grades", e.target.value)}
              placeholder="e.g., K–2"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 16,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: "0 0 12px" }}>
              School portal login
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    Username
                  </label>
                  <button
                    type="button"
                    onClick={() => suggestCredentials(form.name, form.board)}
                    disabled={suggesting || !form.name.trim()}
                    style={{
                      fontSize: 11,
                      color: "#004aad",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {suggesting ? "Suggesting…" : "Auto-suggest"}
                  </button>
                </div>
                <input
                  value={form.portal_username}
                  onChange={(e) => set("portal_username", e.target.value)}
                  placeholder="school.portal@portal.local"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Password {isCreate ? "" : "(leave blank to keep current)"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.portal_password}
                    onChange={(e) => set("portal_password", e.target.value)}
                    placeholder={isCreate ? "Auto-generated password" : "Saved portal password"}
                    style={{
                      width: "100%",
                      padding: "9px 40px 9px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
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

          <InstitutionalAccessFields
            form={form}
            isCreate={isCreate}
            saving={saving}
            noticeAction={billingNoticeAction}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSendNotice={onSendBillingNotice}
            onExtendTrial={onExtendTrial ? () => setExtendDaysOpen(true) : undefined}
            extendTrialAction={extendTrialAction}
            onResendActivation={onResendActivation}
            onActivateAccount={onActivateAccount}
            activationAction={activationAction}
          />
        </div>
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              fontSize: 13,
              cursor: "pointer",
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#004aad",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
      <ExtendTrialDaysModal
        open={extendDaysOpen}
        subjectName={form.name}
        submitting={extendTrialAction}
        onClose={() => {
          if (!extendTrialAction) setExtendDaysOpen(false);
        }}
        onConfirm={(days) => {
          if (!onExtendTrial) return;
          void (async () => {
            const ok = await onExtendTrial(days);
            if (ok) setExtendDaysOpen(false);
          })();
        }}
      />
    </div>
  );
}

function toPayload(form: SchoolForm): AdminSchoolPayload {
  const payload: AdminSchoolPayload = {
    name: form.name.trim(),
    city: form.city.trim(),
    school_board: form.board,
    grades: form.grades.trim() || undefined,
    portal_username: form.portal_username.trim(),
    access_mode: form.access_mode,
    trial_started_at: form.access_mode === "trial" ? (form.trial_started_at.trim() || null) : null,
    trial_ends_at: form.access_mode === "trial" ? (form.trial_ends_at.trim() || null) : null,
    subscription_started_at:
      form.access_mode === "subscription" ? (form.subscription_started_at.trim() || null) : null,
    subscription_ends_at:
      form.access_mode === "subscription" ? (form.subscription_ends_at.trim() || null) : null,
  };
  if (form.portal_password.trim()) {
    payload.portal_password = form.portal_password.trim();
  }
  return payload;
}

export function AdminSchoolsPage() {
  const [schools, setSchools] = useState<AdminSchoolRecord[]>([]);
  const [activeBoards, setActiveBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [billingNoticeAction, setBillingNoticeAction] = useState<InstitutionalBillingNoticeType | null>(null);
  const [extendTrialAction, setExtendTrialAction] = useState(false);
  const [activationAction, setActivationAction] = useState<"resend" | "activate" | null>(null);
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState("All Boards");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<{ type: "create" | "edit"; school: SchoolForm } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [accessModal, setAccessModal] = useState<AdminSchoolRecord | null>(null);
  const [accessSavingId, setAccessSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const boardFilterOptions = ["All Boards", ...activeBoards.map((b) => b.code)];

  useEffect(() => {
    adminSchoolBoardsApi
      .list({ status: "Active" })
      .then(({ boards }) =>
        setActiveBoards(boards.map((b) => ({ code: b.code, name: b.name })).sort((a, b) => a.name.localeCompare(b.name)))
      )
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load school boards."));
  }, []);

  const loadSchools = useCallback(() => {
    setLoading(true);
    adminSchoolsApi
      .list({
        search: search || undefined,
        board: board !== "All Boards" ? board : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
      })
      .then(({ schools: data }) => setSchools(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load schools."))
      .finally(() => setLoading(false));
  }, [search, board, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadSchools, 250);
    return () => clearTimeout(timer);
  }, [loadSchools]);

  const openEdit = async (school: AdminSchoolRecord) => {
    setModal({ type: "edit", school: fromRecord(school) });
    setLoadingSchool(true);
    try {
      const { school: full } = await adminSchoolsApi.get(school.id);
      setModal({ type: "edit", school: fromRecord(full) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load school details.");
    } finally {
      setLoadingSchool(false);
    }
  };

  const handleSave = async (form: SchoolForm) => {
    if (!form.name.trim() || !form.city.trim() || !form.portal_username.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!form.id) return;

    setSaving(true);
    try {
      const { school } = await adminSchoolsApi.update(form.id, toPayload(form));
      setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
      toast.success("School updated");
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWizard = async (payload: AdminSchoolPayload) => {
    setSaving(true);
    setWizardError("");
    try {
      const { school, message } = await adminSchoolsApi.create(payload);
      setSchools((prev) => [...prev, school].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(message || "School created");
      setWizardOpen(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Save failed.";
      setWizardError(detail);
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (school: AdminSchoolRecord) => {
    try {
      const { school: updated } = await adminSchoolsApi.archive(school.id);
      setSchools((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(updated.status === "Archived" ? "School archived" : "School restored");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  };

  const handleDelete = async (school: AdminSchoolRecord) => {
    if (school.status !== "Archived") {
      toast.error("Archive the school before permanently deleting it.");
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${school.name}? This cannot be undone and will remove the school portal account.`,
      )
    ) {
      return;
    }

    setDeletingId(school.id);
    try {
      const { message } = await adminSchoolsApi.remove(school.id);
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      toast.success(message || "School permanently deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendBillingNotice = async (type: InstitutionalBillingNoticeType) => {
    if (!modal?.school.id) return;
    setBillingNoticeAction(type);
    try {
      const { school, message } = await adminSchoolsApi.sendBillingNotice(modal.school.id, type);
      setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
      setModal({ type: "edit", school: fromRecord(school) });
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notice.");
    } finally {
      setBillingNoticeAction(null);
    }
  };

  const handleExtendTrial = async (days: number): Promise<boolean> => {
    if (!modal?.school.id) return false;
    setExtendTrialAction(true);
    try {
      const { school, message } = await adminSchoolsApi.extendTrial(modal.school.id, days);
      setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
      setModal({ type: "edit", school: fromRecord(school) });
      toast.success(message);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend trial.");
      return false;
    } finally {
      setExtendTrialAction(false);
    }
  };

  const handleResendActivation = async () => {
    if (!modal?.school.id) return;
    setActivationAction("resend");
    try {
      const { school, message } = await adminSchoolsApi.resendActivation(modal.school.id);
      setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
      setModal({ type: "edit", school: fromRecord(school) });
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend activation.");
    } finally {
      setActivationAction(null);
    }
  };

  const handleActivateAccount = async () => {
    if (!modal?.school.id) return;
    setActivationAction("activate");
    try {
      const { school, message } = await adminSchoolsApi.activateAccount(modal.school.id);
      setSchools((prev) => prev.map((s) => (s.id === school.id ? school : s)));
      setModal({ type: "edit", school: fromRecord(school) });
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate account.");
    } finally {
      setActivationAction(null);
    }
  };

  const activeCount = schools.filter((s) => s.status === "Active").length;

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Schools</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {activeCount} active schools on the platform
            </p>
          </div>
          <button
            onClick={() => {
              setWizardError("");
              setWizardOpen(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              borderRadius: 9,
              border: "none",
              background: "#004aad",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> New School
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search
              size={14}
              color="#94a3b8"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a school..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {[
            { value: board, onChange: setBoard, options: boardFilterOptions },
            { value: statusFilter, onChange: setStatusFilter, options: ["All", "Active", "Archived"] },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                style={{
                  padding: "9px 32px 9px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  background: "white",
                  cursor: "pointer",
                  outline: "none",
                  appearance: "none",
                }}
              >
                {sel.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown
                size={13}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid #f1f5f9",
            overflowX: "auto",
            overflowY: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <Loader2 className="animate-spin" size={24} color="#004aad" />
            </div>
          ) : (
            <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["School", "Board", "City", "Grades", "Teachers", "Students", "Status", "Downloads", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#64748b",
                          letterSpacing: 0.3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {schools.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "white" : "#fafbfc",
                    }}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: "#f0f7ff", borderRadius: 8, padding: 7 }}>
                          <School size={14} color="#38b6ff" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 10,
                          background: "#dff3ff",
                          color: "#004aad",
                        }}
                      >
                        {s.board || "None"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{s.city}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{s.grades}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                      {s.teachers}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                      {s.students}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 12,
                          background: s.status === "Active" ? "#ecfdf5" : "#f8fafc",
                          color: s.status === "Active" ? "#059669" : "#94a3b8",
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <ResourceAccessToggle
                        enabled={Boolean(s.resource_access_enabled)}
                        disabled={accessSavingId === s.id}
                        onConfigure={() => setAccessModal(s)}
                        onDisable={async () => {
                          setAccessSavingId(s.id);
                          try {
                            const current = await resourceAccessApi.school(s.id);
                            const result = await resourceAccessApi.saveSchool(s.id, {
                              enabled: false,
                              items: current.items ?? [],
                            });
                            setSchools((prev) => prev.map((row) => (
                              row.id === s.id ? { ...row, resource_access_enabled: result.enabled } : row
                            )));
                            toast.success(result.message || "Download permissions turned off.");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to update download permissions.");
                          } finally {
                            setAccessSavingId(null);
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => openEdit(s)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleArchive(s)}
                          disabled={deletingId === s.id}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: s.status === "Archived" ? "1px solid #d1fae5" : "1px solid #fee2e2",
                            background: s.status === "Archived" ? "#ecfdf5" : "#fff5f5",
                            cursor: deletingId === s.id ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: s.status === "Archived" ? "#059669" : "#ef4444",
                          }}
                        >
                          <Archive size={12} /> {s.status === "Archived" ? "Restore" : "Archive"}
                        </button>
                        {s.status === "Archived" && (
                          <button
                            onClick={() => void handleDelete(s)}
                            disabled={deletingId === s.id}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              cursor: deletingId === s.id ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#be123c",
                            }}
                          >
                            {deletingId === s.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && schools.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No school found.
            </div>
          )}
        </div>
      </div>
      {wizardOpen && (
        <CreateSchoolWizard
          saving={saving}
          error={wizardError}
          boardOptions={modalBoardOptions(activeBoards, "")}
          defaultBoard={activeBoards[0]?.code ?? ""}
          onClose={() => {
            setWizardOpen(false);
            setWizardError("");
          }}
          onSubmit={handleCreateWizard}
        />
      )}
      {modal?.type === "edit" && (
        <Modal
          title="Edit School"
          school={modal.school}
          isCreate={false}
          boardOptions={modalBoardOptions(activeBoards, modal.school.board)}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving || loadingSchool}
          onSendBillingNotice={handleSendBillingNotice}
          billingNoticeAction={billingNoticeAction}
          onExtendTrial={handleExtendTrial}
          extendTrialAction={extendTrialAction}
          onResendActivation={handleResendActivation}
          onActivateAccount={handleActivateAccount}
          activationAction={activationAction}
        />
      )}
      <ResourceAccessModal
        open={Boolean(accessModal)}
        title="Download & export permissions"
        subjectName={accessModal?.name ?? ""}
        subjectId={accessModal?.id ?? null}
        load={() => resourceAccessApi.school(accessModal!.id)}
        save={(payload) => resourceAccessApi.saveSchool(accessModal!.id, payload)}
        onClose={() => setAccessModal(null)}
        onSaved={(enabled, message) => {
          if (accessModal) {
            setSchools((prev) => prev.map((row) => (
              row.id === accessModal.id ? { ...row, resource_access_enabled: enabled } : row
            )));
          }
          toast.success(message || "Download permissions saved.");
          setAccessModal(null);
        }}
      />
    </AdminLayout>
  );
}
