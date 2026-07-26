import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "./AdminLayout";
import {
  Plus, Search, Edit2, Archive, X, ChevronDown, User, Mail, Phone, Loader2, Eye, EyeOff, Send, UserCheck, Trash2, Bell,
} from "lucide-react";
import {
  adminTeachersApi,
  adminSchoolBoardsApi,
  type AdminSchool,
  type AdminTeacherPayload,
  type AdminTeacherRecord,
} from "../../api/client";

const TITLES = ["Mr.", "Mrs.", "Mme", "M."];
const STATUSES = ["Active", "Pending activation", "Inactive", "Archived"];
const ACTIVE_STATUS_FILTERS = ["Active", "Pending activation", "Inactive"];
const ACCESS_FILTERS = ["All access", "Trial", "Trial ending soon", "Trial expired", "Subscribed", "Institutional"];
const LOGIN_INACTIVE_DAYS = 30;
const LIST_TABS = [
  { id: "active" as const, label: "Teachers" },
  { id: "archived" as const, label: "Archived" },
  { id: "inactive" as const, label: "Inactive" },
];
const PAGE_SIZE = 20;

const statusColors: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#ecfdf5", color: "#059669" },
  "Pending activation": { bg: "#fff7ed", color: "#c2410c" },
  Inactive: { bg: "#fffbeb", color: "#d97706" },
  Archived: { bg: "#f8fafc", color: "#94a3b8" },
};

const accessColors: Record<string, { bg: string; color: string }> = {
  Trial: { bg: "#eff6ff", color: "#1d4ed8" },
  "Trial expired": { bg: "#fff1f2", color: "#be123c" },
  Essentials: { bg: "#ecfdf5", color: "#059669" },
  Insights: { bg: "#f5f3ff", color: "#6d28d9" },
  Institutional: { bg: "#f0fdf4", color: "#15803d" },
  "Pending join": { bg: "#fff7ed", color: "#c2410c" },
  None: { bg: "#f8fafc", color: "#94a3b8" },
};

function formatTrialEnd(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatLastLogin(teacher: AdminTeacherRecord): { label: string; detail: string; warn: boolean } {
  const days = teacher.days_since_last_login;
  if (days === null || days === undefined) {
    return { label: "Never", detail: "No login recorded", warn: true };
  }
  if (!teacher.last_login_at && days === 0) {
    return { label: "Today", detail: "Account created today", warn: false };
  }
  if (days === 0) {
    return { label: "Today", detail: formatTrialEnd(teacher.last_login_at), warn: false };
  }
  if (days === 1) {
    return {
      label: "1 day ago",
      detail: teacher.last_login_at ? formatTrialEnd(teacher.last_login_at) : "Never logged in",
      warn: false,
    };
  }
  return {
    label: `${days} days ago`,
    detail: teacher.last_login_at ? formatTrialEnd(teacher.last_login_at) : "Never logged in",
    warn: teacher.login_inactive || days >= LOGIN_INACTIVE_DAYS,
  };
}

function matchesAccessFilter(teacher: AdminTeacherRecord, filter: string): boolean {
  if (filter === "All access") return true;
  if (filter === "Trial") return teacher.access === "Trial";
  if (filter === "Trial expired") return teacher.access === "Trial expired";
  if (filter === "Institutional") return teacher.access === "Institutional";
  if (filter === "Subscribed") return teacher.access === "Essentials" || teacher.access === "Insights";
  if (filter === "Trial ending soon") {
    return teacher.access === "Trial" && teacher.trial_days_remaining <= 7;
  }
  return true;
}

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
  trial_ends_at: string;
  access: string;
  is_trial_active: boolean;
  trial_days_remaining: number;
  portal_username: string;
  portal_password: string;
  activation_pending: boolean;
  affiliation_type: string | null;
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

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
  trial_ends_at: "",
  access: "None",
  is_trial_active: false,
  trial_days_remaining: 0,
  portal_username: "",
  portal_password: "",
  activation_pending: false,
  affiliation_type: null,
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
  if (!isCreate) {
    payload.trial_ends_at = form.trial_ends_at.trim() || null;
  }
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
    trial_ends_at: toDateInput(teacher.trial_ends_at),
    access: teacher.access,
    is_trial_active: teacher.is_trial_active,
    trial_days_remaining: teacher.trial_days_remaining,
    portal_username: username,
    portal_password: teacher.portal_password ?? "",
    activation_pending: teacher.activation_pending,
    affiliation_type: teacher.affiliation_type ?? null,
  };
}

function TeacherModal({
  mode,
  initialForm,
  schools,
  boardOptions,
  saving,
  error,
  message,
  activationAction,
  billingNoticeAction,
  onClose,
  onSave,
  onResendActivation,
  onActivateAccount,
  onSendBillingNotice,
}: {
  mode: "create" | "edit";
  initialForm: FormState;
  schools: AdminSchool[];
  boardOptions: BoardOption[];
  saving: boolean;
  error: string;
  message: string;
  activationAction: "resend" | "activate" | null;
  billingNoticeAction: "trial_ending" | "trial_expired" | null;
  onClose: () => void;
  onSave: (form: FormState) => void;
  onResendActivation: () => void;
  onActivateAccount: () => void;
  onSendBillingNotice: (type: "trial_ending" | "trial_expired") => void;
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

  const suggestCredentials = useCallback(async (firstName: string, lastName: string, board: string) => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSuggesting(true);
    try {
      const creds = await adminTeachersApi.suggestCredentials(firstName.trim(), lastName.trim(), board);
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
      const { teacher } = await adminTeachersApi.get(form.id);
      setForm((f) => ({ ...f, portal_password: teacher.portal_password ?? "" }));
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

          {!isCreate && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: 0 }}>Trial &amp; subscription follow-up</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", background: "#e2e8f0", borderRadius: 999, padding: "3px 8px" }}>
                  {form.access || "None"}
                  {form.is_trial_active ? ` · ${form.trial_days_remaining}d left` : ""}
                </span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                  Trial end date
                </label>
                <input
                  type="date"
                  value={form.trial_ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, trial_ends_at: e.target.value }))}
                  style={plainInputStyle}
                />
                <p style={{ fontSize: 11, color: "#64748b", margin: "6px 0 0", lineHeight: 1.45 }}>
                  Set a past date to test expiry, or a near future date to test ending-soon notices. Save before sending.
                  Soft-lock applies to individual (non-institutional) teachers only.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onSendBillingNotice("trial_ending")}
                  disabled={saving || billingNoticeAction !== null}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", borderRadius: 7, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {billingNoticeAction === "trial_ending" ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                  Send trial ending soon
                </button>
                <button
                  type="button"
                  onClick={() => onSendBillingNotice("trial_expired")}
                  disabled={saving || billingNoticeAction !== null}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", borderRadius: 7, border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {billingNoticeAction === "trial_expired" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send trial expired
                </button>
              </div>
            </div>
          )}

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
                    setForm((prev) => ({ ...prev, portal_username: value }));
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

          {!isCreate && form.activation_pending && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>
                {form.status === "Pending activation" || form.affiliation_type === "school" || form.affiliation_type === "board"
                  ? "School / board activation pending"
                  : "Email activation pending"}
              </div>
              <p style={{ fontSize: 12, color: "#9a3412", margin: "0 0 12px", lineHeight: 1.5 }}>
                {form.status === "Pending activation" || form.affiliation_type === "school" || form.affiliation_type === "board"
                  ? "This teacher requested to join through a school or school board and is waiting for approval."
                  : "This teacher has not activated the account from the email link yet."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!(form.status === "Pending activation" || form.affiliation_type === "school" || form.affiliation_type === "board") && (
                  <button
                    type="button"
                    onClick={onResendActivation}
                    disabled={saving || activationAction !== null}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", borderRadius: 7, border: "1px solid #fdba74", background: "white", color: "#c2410c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {activationAction === "resend" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Resend activation email
                  </button>
                )}
                <button
                  type="button"
                  onClick={onActivateAccount}
                  disabled={saving || activationAction !== null}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", borderRadius: 7, border: "none", background: "#059669", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {activationAction === "activate" ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  Activate account now
                </button>
              </div>
            </div>
          )}

          {message && <p style={{ fontSize: 12, color: "#047857", background: "#ecfdf5", borderRadius: 8, padding: "9px 11px", margin: 0 }}>{message}</p>}
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

export function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacherRecord[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("All Schools");
  const [statusFilter, setStatusFilter] = useState("All");
  const [accessFilter, setAccessFilter] = useState("All access");
  const [listTab, setListTab] = useState<"active" | "archived" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalNotice, setModalNotice] = useState("");
  const [activationAction, setActivationAction] = useState<"resend" | "activate" | null>(null);
  const [billingNoticeAction, setBillingNoticeAction] = useState<"trial_ending" | "trial_expired" | null>(null);
  const [notice, setNotice] = useState("");
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [inactivityEmailAction, setInactivityEmailAction] = useState<{
    id: number;
    type: "inactive_reminder" | "suspension_reminder";
  } | null>(null);

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

  const archivedTeachers = teachers.filter((t) => t.status === "Archived");
  const inactiveTeachers = teachers.filter((t) => t.status !== "Archived" && t.login_inactive);
  const activeTeachers = teachers.filter((t) => t.status !== "Archived" && !t.login_inactive);
  const tabTeachers =
    listTab === "archived" ? archivedTeachers : listTab === "inactive" ? inactiveTeachers : activeTeachers;

  const filtered = tabTeachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchSchool = schoolFilter === "All Schools" || t.school === schoolFilter;
    if (listTab === "archived" || listTab === "inactive") {
      return matchSearch && matchSchool;
    }
    const displayStatus = t.activation_pending ? "Pending activation" : t.status;
    const matchStatus = statusFilter === "All" || displayStatus === statusFilter;
    const matchAccess = matchesAccessFilter(t, accessFilter);
    return matchSearch && matchSchool && matchStatus && matchAccess;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, schoolFilter, statusFilter, accessFilter, listTab]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const trialCount = activeTeachers.filter((t) => t.access === "Trial").length;
  const trialEndingSoonCount = activeTeachers.filter((t) => t.access === "Trial" && t.trial_days_remaining <= 7).length;
  const trialExpiredCount = activeTeachers.filter((t) => t.access === "Trial expired").length;

  const archivedCount = archivedTeachers.length;
  const inactiveCount = inactiveTeachers.length;

  const openCreate = () => {
    setForm(emptyForm(schools[0]?.id ?? 0, boardOptions[0]?.code ?? "CSDM"));
    setModalError("");
    setModalNotice("");
    setModalMode("create");
  };

  const openEdit = async (teacher: AdminTeacherRecord) => {
    setForm(fromRecord(teacher));
    setModalError("");
    setModalNotice("");
    setModalMode("edit");
    setLoadingTeacher(true);
    try {
      const { teacher: full } = await adminTeachersApi.get(teacher.id);
      setForm(fromRecord(full));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load teacher details.");
    } finally {
      setLoadingTeacher(false);
    }
  };

  const closeModal = () => {
    if (!saving && activationAction === null && billingNoticeAction === null) setModalMode(null);
  };

  const handleResendActivation = async () => {
    if (!form.id) return;
    setActivationAction("resend");
    setModalError("");
    setModalNotice("");
    try {
      const result = await adminTeachersApi.resendActivation(form.id);
      setTeachers((prev) => prev.map((teacher) => teacher.id === result.teacher.id ? result.teacher : teacher));
      setForm(fromRecord(result.teacher));
      setModalNotice(result.message);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to resend the activation email.");
    } finally {
      setActivationAction(null);
    }
  };

  const handleActivateAccount = async () => {
    if (!form.id) return;
    setActivationAction("activate");
    setModalError("");
    setModalNotice("");
    try {
      const result = await adminTeachersApi.activateAccount(form.id);
      setTeachers((prev) => prev.map((teacher) => teacher.id === result.teacher.id ? result.teacher : teacher));
      setForm(fromRecord(result.teacher));
      setModalNotice(result.message);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to activate the account.");
    } finally {
      setActivationAction(null);
    }
  };

  const handleSendBillingNotice = async (type: "trial_ending" | "trial_expired") => {
    if (!form.id) return;
    setBillingNoticeAction(type);
    setModalError("");
    setModalNotice("");
    try {
      const result = await adminTeachersApi.sendBillingNotice(form.id, type);
      setTeachers((prev) => prev.map((teacher) => teacher.id === result.teacher.id ? result.teacher : teacher));
      setForm(fromRecord(result.teacher));
      setModalNotice(result.message);
      toast.success(result.message);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to send the billing notice.");
    } finally {
      setBillingNoticeAction(null);
    }
  };

  const handleSendInactivityNotice = async (
    teacherId: number,
    type: "inactive_reminder" | "suspension_reminder",
  ) => {
    setInactivityEmailAction({ id: teacherId, type });
    try {
      const result = await adminTeachersApi.sendInactivityNotice(teacherId, type);
      setTeachers((prev) => prev.map((teacher) => (teacher.id === result.teacher.id ? result.teacher : teacher)));
      setNotice(result.message);
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to send inactivity email.");
    } finally {
      setInactivityEmailAction(null);
    }
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
        const result = await adminTeachersApi.create(payload);
        setTeachers((prev) => [...prev, result.teacher].sort((a, b) => a.name.localeCompare(b.name)));
        setNotice(
          result.email_sent
            ? "Teacher created. An activation email was sent to their address."
            : result.message || "Teacher created, but the activation email could not be sent."
        );
      } else if (modalMode === "edit" && form.id) {
        const { teacher } = await adminTeachersApi.update(form.id, payload);
        setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
        setNotice("");
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
      if (teacher.status === "Archived") {
        setNotice("Teacher archived.");
        setListTab("archived");
      } else {
        setNotice("Teacher restored.");
        setListTab("active");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed.");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (teacher: AdminTeacherRecord) => {
    if (
      !window.confirm(
        `Permanently delete ${teacher.name}? This cannot be undone and will remove their classes.`,
      )
    ) {
      return;
    }

    setDeletingId(teacher.id);
    try {
      await adminTeachersApi.remove(teacher.id);
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      setNotice("Teacher permanently deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
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
              {loading
                ? "Loading…"
                : listTab === "archived"
                  ? `${archivedCount} archived teacher${archivedCount === 1 ? "" : "s"}`
                  : listTab === "inactive"
                    ? `${inactiveCount} inactive teacher${inactiveCount === 1 ? "" : "s"} (no login for ${LOGIN_INACTIVE_DAYS}+ days)`
                    : `${activeTeachers.length} active teachers · ${inactiveCount} inactive · ${archivedCount} archived`}
            </p>
          </div>
          {listTab === "active" && (
            <button
              onClick={openCreate}
              disabled={loading || schools.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={15} /> New Teacher
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={loadData} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
              Retry
            </button>
          </div>
        )}

        {notice && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#047857", fontWeight: 600 }}>
              ✕
            </button>
          </div>
        )}

        {listTab === "active" && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { label: "On trial", value: trialCount, filter: "Trial", bg: "#eff6ff", color: "#1d4ed8" },
              { label: "Ending in ≤7 days", value: trialEndingSoonCount, filter: "Trial ending soon", bg: "#fffbeb", color: "#b45309" },
              { label: "Trial expired", value: trialExpiredCount, filter: "Trial expired", bg: "#fff1f2", color: "#be123c" },
            ].map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => setAccessFilter(card.filter)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: accessFilter === card.filter ? `2px solid ${card.color}` : "1px solid #e2e8f0",
                  background: card.bg,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: 0.4 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{card.value}</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
          {LIST_TABS.map((tab) => {
            const active = listTab === tab.id;
            const count =
              tab.id === "archived"
                ? archivedCount
                : tab.id === "inactive"
                  ? inactiveCount
                  : activeTeachers.length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setListTab(tab.id);
                  setStatusFilter("All");
                  setAccessFilter("All access");
                  setPage(1);
                }}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: active ? "2px solid #004aad" : "2px solid transparent",
                  background: "transparent",
                  color: active ? "#004aad" : "#64748b",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: active ? "#dff3ff" : "#f1f5f9",
                    color: active ? "#004aad" : "#64748b",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {listTab === "inactive" && (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            Teachers with no login activity for {LOGIN_INACTIVE_DAYS}+ days are tagged as Inactive.
          </p>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                listTab === "archived"
                  ? "Search archived teachers..."
                  : listTab === "inactive"
                    ? "Search inactive teachers..."
                    : "Search for a teacher..."
              }
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: schoolFilter, onChange: setSchoolFilter, options: schoolOptions },
            ...(listTab === "active"
              ? [
                  { value: statusFilter, onChange: setStatusFilter, options: ["All", ...ACTIVE_STATUS_FILTERS] },
                  { value: accessFilter, onChange: setAccessFilter, options: ACCESS_FILTERS },
                ]
              : []),
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
                  {["Teacher", "Email", "School", "Board", "Access", "Trial", "Last login", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((t, i) => {
                  const displayStatus = t.activation_pending
                    ? "Pending activation"
                    : t.login_inactive
                      ? "Inactive"
                      : t.status;
                  const sc = statusColors[displayStatus] || statusColors.Archived;
                  const ac = accessColors[t.access] || accessColors.None;
                  const lastLogin = formatLastLogin(t);
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
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>
                          {t.access}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
                        {t.access === "Trial" ? (
                          <span style={{ fontWeight: 700, color: t.trial_days_remaining <= 7 ? "#b45309" : "#1d4ed8" }}>
                            {t.trial_days_remaining}d left
                            <span style={{ display: "block", fontWeight: 500, color: "#94a3b8", fontSize: 11 }}>
                              ends {formatTrialEnd(t.trial_ends_at)}
                            </span>
                          </span>
                        ) : t.access === "Trial expired" ? (
                          <span style={{ color: "#be123c", fontWeight: 600 }}>Expired {formatTrialEnd(t.trial_ends_at)}</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: lastLogin.warn ? "#b45309" : "#334155" }}>
                          {lastLogin.label}
                        </span>
                        <span style={{ display: "block", fontWeight: 500, color: "#94a3b8", fontSize: 11 }}>
                          {lastLogin.detail}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>{displayStatus}</span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {listTab === "active" ? (
                            <>
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
                                Archive
                              </button>
                            </>
                          ) : listTab === "inactive" ? (
                            <>
                              <button
                                onClick={() => handleSendInactivityNotice(t.id, "inactive_reminder")}
                                disabled={inactivityEmailAction?.id === t.id}
                                title="Inactive Account Reminder"
                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #dbeafe", background: "#eff6ff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#1d4ed8" }}
                              >
                                {inactivityEmailAction?.id === t.id && inactivityEmailAction.type === "inactive_reminder" ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Bell size={12} />
                                )}
                                Inactive reminder
                              </button>
                              <button
                                onClick={() => handleSendInactivityNotice(t.id, "suspension_reminder")}
                                disabled={inactivityEmailAction?.id === t.id}
                                title="Account Suspension Reminder"
                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #ffedd5", background: "#fff7ed", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#c2410c" }}
                              >
                                {inactivityEmailAction?.id === t.id && inactivityEmailAction.type === "suspension_reminder" ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Send size={12} />
                                )}
                                Suspension reminder
                              </button>
                              <button
                                onClick={() => openEdit(t)}
                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleArchive(t.id)}
                                disabled={archivingId === t.id || deletingId === t.id}
                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1fae5", background: "#ecfdf5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#059669" }}
                              >
                                {archivingId === t.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Archive size={12} />
                                )}
                                Restore
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
                                disabled={deletingId === t.id || archivingId === t.id}
                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fecdd3", background: "#fff1f2", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#be123c" }}
                              >
                                {deletingId === t.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              {listTab === "archived"
                ? "No archived teachers."
                : listTab === "inactive"
                  ? `No teachers inactive for ${LOGIN_INACTIVE_DAYS}+ days.`
                  : "No teacher found."}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "12px 16px",
                borderTop: "1px solid #f1f5f9",
                background: "#f8fafc",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: currentPage <= 1 ? "#f1f5f9" : "white",
                    color: currentPage <= 1 ? "#94a3b8" : "#334155",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", minWidth: 80, textAlign: "center" }}>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: currentPage >= totalPages ? "#f1f5f9" : "white",
                    color: currentPage >= totalPages ? "#94a3b8" : "#334155",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalMode && (
        <TeacherModal
          mode={modalMode}
          initialForm={form}
          schools={schools}
          boardOptions={boardOptions}
          saving={saving || loadingTeacher}
          error={modalError}
          message={modalNotice}
          activationAction={activationAction}
          billingNoticeAction={billingNoticeAction}
          onClose={closeModal}
          onSave={handleSave}
          onResendActivation={handleResendActivation}
          onActivateAccount={handleActivateAccount}
          onSendBillingNotice={handleSendBillingNotice}
        />
      )}
    </AdminLayout>
  );
}
