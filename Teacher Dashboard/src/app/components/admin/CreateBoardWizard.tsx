import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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
  adminClassTypesApi,
  adminSchoolBoardsApi,
  adminSchoolsApi,
  adminTeachersApi,
  type AdminClassTypeRecord,
  type AdminSchoolBoardMemberSchool,
  type AdminSchoolBoardMemberTeacher,
  type AdminSchoolBoardPayload,
  type AdminSchoolRecord,
  type AdminTeacherRecord,
  type InstitutionalAccessMode,
} from "../../api/client";
import {
  emptyInstitutionalAccess,
  InstitutionalAccessFields,
  type InstitutionalAccessForm,
} from "./InstitutionalAccessFields";

type BoardDetails = {
  name: string;
  email: string;
  password: string;
  contact_person: string;
  code: string;
} & InstitutionalAccessForm;

type SchoolDraft = {
  key: string;
  existing_id: number | null;
  name: string;
  email: string;
  password: string;
  city: string;
};

type TeacherDraft = {
  key: string;
  existing_id: number | null;
  name: string;
  email: string;
  password: string;
  school_temp_key: string;
  class_types: string[];
};

const STEPS = [
  "School Board Details",
  "Add Schools",
  "Add Teachers",
  "Preview",
] as const;

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

function randomKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyBoardDetails(): BoardDetails {
  return {
    name: "",
    email: "",
    password: "",
    contact_person: "",
    code: "",
    ...emptyInstitutionalAccess(),
  };
}

function emptySchool(): SchoolDraft {
  return {
    key: randomKey("school"),
    existing_id: null,
    name: "",
    email: "",
    password: "",
    city: "",
  };
}

function emptyTeacher(): TeacherDraft {
  return {
    key: randomKey("teacher"),
    existing_id: null,
    name: "",
    email: "",
    password: "",
    school_temp_key: "",
    class_types: [],
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

export function CreateBoardWizard({
  saving,
  error,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: AdminSchoolBoardPayload) => void;
}) {
  const [step, setStep] = useState(1);
  const [board, setBoard] = useState<BoardDetails>(emptyBoardDetails);
  const [schools, setSchools] = useState<SchoolDraft[]>([]);
  const [teachers, setTeachers] = useState<TeacherDraft[]>([]);
  const [localError, setLocalError] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState<AdminSchoolRecord[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherResults, setTeacherResults] = useState<AdminTeacherRecord[]>([]);
  const [searchingTeachers, setSearchingTeachers] = useState(false);
  const [classTypes, setClassTypes] = useState<AdminClassTypeRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { class_types } = await adminClassTypesApi.list();
        setClassTypes(class_types.filter((t) => t.is_active));
      } catch {
        setClassTypes([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!board.name.trim()) return;
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const creds = await adminSchoolBoardsApi.suggestCredentials(board.name.trim(), board.code || "");
        setBoard((b) => ({
          ...b,
          code: b.code || creds.code,
          password: b.password || creds.portal_password,
        }));
      } catch {
        // keep manual values
      } finally {
        setSuggesting(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [board.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 2 || schoolSearch.trim().length < 2) {
      setSchoolResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const { schools: data } = await adminSchoolsApi.list({ search: schoolSearch.trim() });
        const selectedIds = new Set(schools.filter((s) => s.existing_id).map((s) => s.existing_id));
        setSchoolResults(data.filter((s) => !selectedIds.has(s.id)).slice(0, 8));
      } catch {
        setSchoolResults([]);
      } finally {
        setSearchingSchools(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch, step, schools]);

  useEffect(() => {
    if (step !== 3 || teacherSearch.trim().length < 2) {
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

  const schoolOptions = useMemo(
    () => schools.filter((s) => s.name.trim()).map((s) => ({ key: s.key, label: s.name })),
    [schools],
  );

  const generatePassword = useCallback(async () => {
    try {
      const creds = await adminSchoolBoardsApi.suggestCredentials(board.name || "Board", board.code || "BOARD");
      return creds.portal_password;
    } catch {
      return Math.random().toString(36).slice(2) + "Aa1!";
    }
  }, [board.name, board.code]);

  const addExistingSchool = async (school: AdminSchoolRecord) => {
    const password = await generatePassword();
    setSchools((prev) => [
      ...prev,
      {
        key: randomKey("school"),
        existing_id: school.id,
        name: school.name,
        email: school.portal_username || "",
        password,
        city: school.city || "",
      },
    ]);
    setSchoolSearch("");
    setSchoolResults([]);
  };

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
        school_temp_key: schoolOptions[0]?.key ?? "",
        class_types: [],
      },
    ]);
    setTeacherSearch("");
    setTeacherResults([]);
  };

  const validateStep = (current: number): string => {
    if (current === 1) {
      if (!board.name.trim()) return "Board name is required.";
      if (!board.email.trim() || !board.email.includes("@")) return "A valid email is required.";
      if (board.password.trim().length < 8) return "Temporary password must be at least 8 characters.";
      if (!board.contact_person.trim()) return "Contact person is required.";
      if (!board.code.trim()) return "Board code is required (auto-generated from the name).";
      return "";
    }
    if (current === 2) {
      for (const school of schools) {
        if (!school.name.trim()) return "Each school needs a name.";
        if (!school.email.trim() || !school.email.includes("@")) return `School "${school.name}" needs a valid email.`;
        if (school.password.trim().length < 8) return `School "${school.name}" needs a temporary password (min 8).`;
      }
      return "";
    }
    if (current === 3) {
      for (const teacher of teachers) {
        if (!teacher.name.trim()) return "Each teacher needs a name.";
        if (!teacher.email.trim() || !teacher.email.includes("@")) return `Teacher "${teacher.name}" needs a valid email.`;
        if (teacher.password.trim().length < 8) return `Teacher "${teacher.name}" needs a temporary password (min 8).`;
        if (teacher.class_types.length === 0) return `Select at least one class type for "${teacher.name}".`;
      }
      return "";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep(step);
    setLocalError(err);
    if (err) return;
    setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
  };

  const goBack = () => {
    setLocalError("");
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
  };

  const buildPayload = (): AdminSchoolBoardPayload => {
    const schoolPayload: AdminSchoolBoardMemberSchool[] = schools.map((s) => ({
      temp_key: s.key,
      existing_id: s.existing_id,
      name: s.name.trim(),
      email: s.email.trim(),
      password: s.password,
      city: s.city.trim() || undefined,
    }));

    const teacherPayload: AdminSchoolBoardMemberTeacher[] = teachers.map((t) => ({
      existing_id: t.existing_id,
      name: t.name.trim(),
      email: t.email.trim(),
      password: t.password,
      school_temp_key: t.school_temp_key || null,
      class_types: t.class_types,
    }));

    return {
      name: board.name.trim(),
      code: board.code.trim().toUpperCase(),
      contact_person: board.contact_person.trim(),
      status: "Active",
      portal_username: board.email.trim(),
      portal_password: board.password,
      access_mode: board.access_mode as InstitutionalAccessMode,
      trial_started_at: board.access_mode === "trial" ? board.trial_started_at || null : null,
      trial_ends_at: board.access_mode === "trial" ? board.trial_ends_at || null : null,
      subscription_started_at:
        board.access_mode === "subscription" ? board.subscription_started_at || null : null,
      subscription_ends_at:
        board.access_mode === "subscription" ? board.subscription_ends_at || null : null,
      schools: schoolPayload,
      teachers: teacherPayload,
    };
  };

  const handleSubmit = () => {
    const err = validateStep(1) || validateStep(2) || validateStep(3);
    setLocalError(err);
    if (err) return;
    onSubmit(buildPayload());
  };

  const displayError = localError || error;

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>New School Board</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
              Step {step} of 4 — {STEPS[step - 1]}
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
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Board Name
                </label>
                <input
                  value={board.name}
                  onChange={(e) => setBoard((b) => ({ ...b, name: e.target.value, code: "" }))}
                  placeholder="e.g., Montreal School Board (CSDM)"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={board.email}
                  onChange={(e) => setBoard((b) => ({ ...b, email: e.target.value }))}
                  placeholder="board.admin@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Temporary password {suggesting ? "(generating…)" : ""}
                </label>
                <PasswordField
                  value={board.password}
                  onChange={(v) => setBoard((b) => ({ ...b, password: v }))}
                  placeholder="Temporary password"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Contact Person
                </label>
                <input
                  value={board.contact_person}
                  onChange={(e) => setBoard((b) => ({ ...b, contact_person: e.target.value }))}
                  placeholder="e.g., Marie Tremblay"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Code (auto-generated)
                </label>
                <input
                  value={board.code}
                  readOnly
                  style={{ ...inputStyle, background: "#f8fafc", color: "#64748b" }}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Search an existing school to attach it, or add a new school with login credentials.
              </p>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                <input
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder="Search existing schools…"
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
                {(searchingSchools || schoolResults.length > 0) && (
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
                    {searchingSchools && (
                      <div style={{ padding: 12, fontSize: 12, color: "#94a3b8" }}>Searching…</div>
                    )}
                    {!searchingSchools &&
                      schoolResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => void addExistingSchool(s)}
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
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {s.city}
                            {s.board ? ` · ${s.board}` : ""}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {schools.map((school, index) => (
                <div
                  key={school.key}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: school.existing_id ? "#f8fafc" : "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#004aad" }}>
                      {school.existing_id ? "Existing school" : `New school ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSchools((prev) => prev.filter((s) => s.key !== school.key))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    value={school.name}
                    onChange={(e) =>
                      setSchools((prev) =>
                        prev.map((s) => (s.key === school.key ? { ...s, name: e.target.value } : s)),
                      )
                    }
                    placeholder="School name"
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    value={school.email}
                    onChange={(e) =>
                      setSchools((prev) =>
                        prev.map((s) => (s.key === school.key ? { ...s, email: e.target.value } : s)),
                      )
                    }
                    placeholder="Email"
                    style={inputStyle}
                  />
                  <PasswordField
                    value={school.password}
                    onChange={(v) =>
                      setSchools((prev) =>
                        prev.map((s) => (s.key === school.key ? { ...s, password: v } : s)),
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
                    setSchools((prev) => [...prev, { ...emptySchool(), password }]);
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
                <Plus size={14} /> Add New School
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Search an existing teacher or add a new one. Optionally assign them to a school from step 2.
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
                      teacherResults.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => void addExistingTeacher(t)}
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
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {t.email}
                            {t.school ? ` · ${t.school}` : ""}
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
                  {schoolOptions.length > 0 && (
                    <select
                      value={teacher.school_temp_key}
                      onChange={(e) =>
                        setTeachers((prev) =>
                          prev.map((t) =>
                            t.key === teacher.key ? { ...t, school_temp_key: e.target.value } : t,
                          ),
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="">No school assignment</option>
                      {schoolOptions.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                      Type of classes
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {classTypes.map((type) => {
                        const selected = teacher.class_types.includes(type.name);
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() =>
                              setTeachers((prev) =>
                                prev.map((t) => {
                                  if (t.key !== teacher.key) return t;
                                  const next = selected
                                    ? t.class_types.filter((c) => c !== type.name)
                                    : [...t.class_types, type.name];
                                  return { ...t, class_types: next };
                                }),
                              )
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1.5px solid ${selected ? "#004aad" : "#e2e8f0"}`,
                              background: selected ? "#dff3ff" : "white",
                              color: selected ? "#004aad" : "#475569",
                              fontSize: 12,
                              fontWeight: selected ? 650 : 500,
                              cursor: "pointer",
                            }}
                          >
                            {type.name}
                          </button>
                        );
                      })}
                      {classTypes.length === 0 && (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No class types configured.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    const password = await generatePassword();
                    setTeachers((prev) => [
                      ...prev,
                      { ...emptyTeacher(), password, school_temp_key: schoolOptions[0]?.key ?? "" },
                    ]);
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

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#004aad" }}>
                  School Board
                </h3>
                <PreviewRow label="Name" value={board.name} />
                <PreviewRow label="Email" value={board.email} />
                <PreviewRow label="Contact" value={board.contact_person} />
                <PreviewRow label="Code" value={board.code} />
              </section>

              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#004aad" }}>
                  Schools ({schools.length})
                </h3>
                {schools.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No schools added.</p>
                )}
                {schools.map((s) => (
                  <div key={s.key} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                    <strong>{s.name}</strong> — {s.email}
                    {s.existing_id ? " (existing)" : " (new)"}
                  </div>
                ))}
              </section>

              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#004aad" }}>
                  Teachers ({teachers.length})
                </h3>
                {teachers.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No teachers added.</p>
                )}
                {teachers.map((t) => {
                  const schoolLabel = schoolOptions.find((s) => s.key === t.school_temp_key)?.label;
                  return (
                    <div key={t.key} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                      <strong>{t.name}</strong> — {t.email}
                      {schoolLabel ? ` · ${schoolLabel}` : ""}
                      {t.class_types.length > 0 ? ` · ${t.class_types.join(", ")}` : ""}
                      {t.existing_id ? " (existing)" : " (new)"}
                    </div>
                  );
                })}
              </section>

              <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <InstitutionalAccessFields
                  form={board}
                  isCreate
                  saving={saving}
                  noticeAction={null}
                  onChange={(patch) => setBoard((b) => ({ ...b, ...patch }))}
                />
              </section>

              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                On submit, the board, schools, and teachers will receive a welcome / activation email with their
                temporary password and a link to activate and sign in.
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
          {step < 4 ? (
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
              Create board & send emails
            </button>
          )}
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
