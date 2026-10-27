import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  adminSchoolsApi,
  adminTeachersApi,
  type AdminSchoolMemberTeacher,
  type AdminSchoolPayload,
  type AdminTeacherRecord,
  type InstitutionalAccessMode,
} from "../../api/client";
import {
  emptyInstitutionalAccess,
  InstitutionalAccessFields,
  type InstitutionalAccessForm,
} from "./InstitutionalAccessFields";

type BoardOption = { code: string; name: string };

type SchoolDetails = {
  name: string;
  board: string;
  email: string;
  password: string;
  contact_person: string;
  code: string;
} & InstitutionalAccessForm;

type TeacherDraft = {
  key: string;
  existing_id: number | null;
  name: string;
  email: string;
  password: string;
};

const STEPS = ["School Details", "Attach Teachers", "Preview"] as const;

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "block",
  marginBottom: 6,
};

function randomKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptySchoolDetails(defaultBoard: string): SchoolDetails {
  return {
    name: "",
    board: defaultBoard,
    email: "",
    password: "",
    contact_person: "",
    code: "",
    ...emptyInstitutionalAccess(),
  };
}

function emptyTeacher(): TeacherDraft {
  return {
    key: randomKey("teacher"),
    existing_id: null,
    name: "",
    email: "",
    password: "",
  };
}

function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
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
        }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function CreateSchoolWizard({
  saving,
  error,
  boardOptions,
  defaultBoard = "",
  onClose,
  onSubmit,
}: {
  saving: boolean;
  error: string;
  boardOptions: BoardOption[];
  defaultBoard?: string;
  onClose: () => void;
  onSubmit: (payload: AdminSchoolPayload) => void;
}) {
  const [step, setStep] = useState(1);
  const [school, setSchool] = useState<SchoolDetails>(() => emptySchoolDetails(defaultBoard));
  const [teachers, setTeachers] = useState<TeacherDraft[]>([]);
  const [localError, setLocalError] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherResults, setTeacherResults] = useState<AdminTeacherRecord[]>([]);
  const [searchingTeachers, setSearchingTeachers] = useState(false);

  useEffect(() => {
    if (!school.name.trim()) return;
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const creds = await adminSchoolsApi.suggestCredentials(
          school.name.trim(),
          school.board,
          school.code || undefined,
        );
        setSchool((s) => ({
          ...s,
          code: s.code || creds.code,
          password: s.password || creds.portal_password,
        }));
      } catch {
        // keep whatever the admin typed
      } finally {
        setSuggesting(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [school.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 2 || teacherSearch.trim().length < 2) {
      setTeacherResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingTeachers(true);
      try {
        const { teachers: data } = await adminTeachersApi.list({ search: teacherSearch.trim() });
        const selectedIds = new Set(teachers.filter((t) => t.existing_id).map((t) => t.existing_id));
        setTeacherResults(data.filter((t) => !selectedIds.has(t.id)).slice(0, 8));
      } catch {
        setTeacherResults([]);
      } finally {
        setSearchingTeachers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [teacherSearch, step, teachers]);

  const generatePassword = useCallback(async () => {
    try {
      const creds = await adminSchoolsApi.suggestCredentials(school.name || "School", school.board);
      return creds.portal_password;
    } catch {
      return Math.random().toString(36).slice(2) + "Aa1!";
    }
  }, [school.name, school.board]);

  const addExistingTeacher = async (teacher: AdminTeacherRecord) => {
    const password = await generatePassword();
    setTeachers((prev) => [
      ...prev,
      {
        key: randomKey("teacher"),
        existing_id: teacher.id,
        name: teacher.name || `${teacher.first_name} ${teacher.last_name}`.trim(),
        email: teacher.email,
        password,
      },
    ]);
    setTeacherSearch("");
    setTeacherResults([]);
  };

  const validateStep = (current: number): string => {
    if (current === 1) {
      if (!school.name.trim()) return "School name is required.";
      if (!school.email.trim() || !school.email.includes("@")) return "A valid email is required.";
      if (school.password.trim().length < 8) return "Temporary password must be at least 8 characters.";
      if (!school.contact_person.trim()) return "Contact person is required.";
      if (!school.code.trim()) return "School code is required (auto-generated from the name).";
      return "";
    }
    if (current === 2) {
      for (const teacher of teachers) {
        if (!teacher.name.trim()) return "Each teacher needs a name.";
        if (!teacher.email.trim() || !teacher.email.includes("@")) {
          return `Teacher "${teacher.name}" needs a valid email.`;
        }
        if (teacher.password.trim().length < 8) {
          return `Teacher "${teacher.name}" needs a temporary password (min 8).`;
        }
      }
      return "";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep(step);
    setLocalError(err);
    if (err) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const goBack = () => {
    setLocalError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const skipTeachers = () => {
    setTeachers([]);
    setTeacherSearch("");
    setLocalError("");
    setStep(3);
  };

  const buildPayload = (): AdminSchoolPayload => {
    const teacherPayload: AdminSchoolMemberTeacher[] = teachers.map((t) => ({
      existing_id: t.existing_id,
      name: t.name.trim(),
      email: t.email.trim(),
      password: t.password,
    }));

    return {
      name: school.name.trim(),
      school_board: school.board || null,
      code: school.code.trim().toUpperCase(),
      contact_person: school.contact_person.trim(),
      portal_username: school.email.trim(),
      portal_password: school.password,
      access_mode: school.access_mode as InstitutionalAccessMode,
      trial_started_at: school.access_mode === "trial" ? school.trial_started_at || null : null,
      trial_ends_at: school.access_mode === "trial" ? school.trial_ends_at || null : null,
      subscription_started_at:
        school.access_mode === "subscription" ? school.subscription_started_at || null : null,
      subscription_ends_at:
        school.access_mode === "subscription" ? school.subscription_ends_at || null : null,
      teachers: teacherPayload,
    };
  };

  const handleSubmit = () => {
    const err = validateStep(1) || validateStep(2);
    setLocalError(err);
    if (err) return;
    onSubmit(buildPayload());
  };

  const displayError = localError || error;
  const boardLabel = boardOptions.find((b) => b.code === school.board)?.name || "None";

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
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: 640,
          maxHeight: "92vh",
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
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>New School</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
              Step {step} of {STEPS.length} — {STEPS[step - 1]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 24px 0", display: "flex", gap: 8, alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: done ? "#c9e265" : active ? "#004aad" : "#e2e8f0",
                    color: done ? "#3a5a00" : active ? "white" : "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {done ? <Check size={12} /> : n}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: done ? "#c9e265" : "#e2e8f0",
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {step === 1 && (
            <>
              <div>
                <label style={labelStyle}>School Name</label>
                <input
                  value={school.name}
                  onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value, code: "" }))}
                  placeholder="e.g., École Saint-Laurent"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>School Board</label>
                <select
                  value={school.board}
                  onChange={(e) => setSchool((s) => ({ ...s, board: e.target.value }))}
                  style={inputStyle}
                >
                  {boardOptions.map((board) => (
                    <option key={board.code || "none"} value={board.code}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={school.email}
                  onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
                  placeholder="school.admin@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Temporary password {suggesting ? "(generating…)" : ""}</label>
                <PasswordField
                  value={school.password}
                  onChange={(v) => setSchool((s) => ({ ...s, password: v }))}
                  placeholder="Temporary password"
                />
              </div>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input
                  value={school.contact_person}
                  onChange={(e) => setSchool((s) => ({ ...s, contact_person: e.target.value }))}
                  placeholder="e.g., Marie Tremblay"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Code (auto-generated)</label>
                <input
                  value={school.code}
                  readOnly
                  style={{ ...inputStyle, background: "#f8fafc", color: "#64748b" }}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Search an existing teacher to attach to this school, add a new one, or skip this step.
              </p>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                <input
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search existing teachers…"
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
                {(searchingTeachers || teacherResults.length > 0) && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "100%",
                      marginTop: 4,
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      zIndex: 5,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      maxHeight: 220,
                      overflow: "auto",
                    }}
                  >
                    {searchingTeachers && (
                      <div style={{ padding: 12, fontSize: 12, color: "#94a3b8" }}>Searching…</div>
                    )}
                    {!searchingTeachers &&
                      teacherResults.map((teacher) => (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => void addExistingTeacher(teacher)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: "white",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{teacher.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {teacher.email}
                            {teacher.school ? ` · ${teacher.school}` : ""}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {teachers.map((teacher, index) => (
                <div
                  key={teacher.key}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: teacher.existing_id ? "#f8fafc" : "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#004aad" }}>
                      {teacher.existing_id ? "Existing teacher" : `New teacher ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTeachers((prev) => prev.filter((t) => t.key !== teacher.key))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    value={teacher.name}
                    onChange={(e) =>
                      setTeachers((prev) =>
                        prev.map((t) => (t.key === teacher.key ? { ...t, name: e.target.value } : t)),
                      )
                    }
                    placeholder="Teacher name"
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    value={teacher.email}
                    onChange={(e) =>
                      setTeachers((prev) =>
                        prev.map((t) => (t.key === teacher.key ? { ...t, email: e.target.value } : t)),
                      )
                    }
                    placeholder="Email"
                    style={inputStyle}
                  />
                  <PasswordField
                    value={teacher.password}
                    onChange={(v) =>
                      setTeachers((prev) =>
                        prev.map((t) => (t.key === teacher.key ? { ...t, password: v } : t)),
                      )
                    }
                    placeholder="Temporary password"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    const password = await generatePassword();
                    setTeachers((prev) => [...prev, { ...emptyTeacher(), password }]);
                  })()
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px dashed #94a3b8",
                  background: "white",
                  color: "#004aad",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} /> Add New Teacher
              </button>
            </>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#004aad" }}>School</h3>
                <PreviewRow label="Name" value={school.name} />
                <PreviewRow label="School board" value={boardLabel} />
                <PreviewRow label="Email" value={school.email} />
                <PreviewRow label="Contact" value={school.contact_person} />
                <PreviewRow label="Code" value={school.code} />
              </section>

              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#004aad" }}>
                  Teachers ({teachers.length})
                </h3>
                {teachers.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No teachers attached.</p>
                )}
                {teachers.map((teacher) => (
                  <div key={teacher.key} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                    <strong>{teacher.name}</strong> — {teacher.email}
                    {teacher.existing_id ? " (existing)" : " (new)"}
                  </div>
                ))}
              </section>

              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <InstitutionalAccessFields
                  form={school}
                  isCreate
                  saving={saving}
                  noticeAction={null}
                  onChange={(patch) => setSchool((s) => ({ ...s, ...patch }))}
                />
              </section>

              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                On submit, the school portal and any attached teachers receive their onboarding email with a
                temporary password. The associated school board is notified that the school joined.
              </p>
            </div>
          )}

          {displayError && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{displayError}</p>}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={step === 1 ? onClose : goBack}
            disabled={saving}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              fontSize: 13,
              cursor: "pointer",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft size={14} /> Back
              </>
            )}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step === 2 && (
              <button
                type="button"
                onClick={skipTeachers}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            )}
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={goNext}
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
                  gap: 6,
                }}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
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
                  gap: 6,
                }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create school &amp; send emails
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ color: "#0a1628", fontWeight: 600, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}
