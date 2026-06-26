import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, ArrowRight, ArrowLeft, Eye, EyeOff,
  Check, School, User, GraduationCap, Users,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

type Step = 1 | 2 | 3;

interface FormData {
  firstName: string; lastName: string; email: string;
  password: string; confirmPassword: string;
  schoolName: string; schoolBoard: string; province: string;
  role: string; grades: string[]; numStudents: string;
  accountType: "school" | "individual" | "";
}

const empty: FormData = {
  firstName: "", lastName: "", email: "",
  password: "", confirmPassword: "",
  schoolName: "", schoolBoard: "", province: "Québec",
  role: "teacher", grades: [], numStudents: "",
  accountType: "",
};

function InputField({ label, type = "text", value, onChange, placeholder, error }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "11px 14px", paddingRight: isPassword ? 40 : 14,
            borderRadius: 12, border: `1.5px solid ${error ? "#ff5757" : "#dff3ff"}`,
            background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box",
            color: "#1e293b",
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: "#ff5757", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepIndicator({ current, total, label }: { current: Step; total: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as Step;
        const done = current > step;
        const active = current === step;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? "#c9e265" : active ? "#004aad" : "#dff3ff",
              fontSize: 12, fontWeight: 700,
              color: done ? "#3a5a00" : active ? "white" : "#94a3b8",
              transition: "all 0.2s",
            }}>
              {done ? <Check size={13} /> : step}
            </div>
            {i < total - 1 && (
              <div style={{ width: 32, height: 2, background: done ? "#c9e265" : "#dff3ff", borderRadius: 1, transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
      <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>
        {label}
      </span>
    </div>
  );
}

export function TeacherSignUpPage() {
  const navigate = useNavigate();
  const { t, tp, lang } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const provinces = useMemo(
    () =>
      lang === "en"
        ? [
            "Alberta", "British Columbia", "Manitoba", "New Brunswick",
            "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island",
            "Quebec", "Saskatchewan",
          ]
        : [
            "Alberta", "Colombie-Britannique", "Manitoba", "Nouveau-Brunswick",
            "Terre-Neuve-et-Labrador", "Nouvelle-Écosse", "Ontario", "Île-du-Prince-Édouard",
            "Québec", "Saskatchewan",
          ],
    [lang]
  );

  const roles = useMemo(
    () => [
      { value: "teacher", label: t("signup.role.teacher"), icon: User },
      { value: "reading", label: t("signup.role.reading"), icon: BookOpen },
      { value: "special_ed", label: t("signup.role.specialEd"), icon: GraduationCap },
    ],
    [t]
  );

  const grades = useMemo(
    () => [
      { value: "Maternelle", label: t("grade.kindergarten") },
      { value: "Jardin", label: t("grade.garden") },
      { value: "1re année", label: t("grade.grade1") },
      { value: "2e année", label: t("grade.grade2") },
    ],
    [t]
  );

  const stepTitles = useMemo(
    () => [
      { title: t("signup.step1.title"), subtitle: t("signup.step1.subtitle") },
      { title: t("signup.step2.title"), subtitle: t("signup.step2.subtitle") },
      { title: t("signup.step3.title"), subtitle: t("signup.step3.subtitle") },
    ],
    [t]
  );

  const accountOptions = useMemo(
    () => [
      {
        value: "school" as const,
        icon: School,
        title: t("signup.viaSchool.title"),
        desc: t("signup.viaSchool.desc"),
        badge: t("signup.recommended"),
      },
      {
        value: "individual" as const,
        icon: Users,
        title: t("signup.individual.title"),
        desc: t("signup.individual.desc"),
        badge: null,
      },
    ],
    [t]
  );

  const set = (k: keyof FormData, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const toggleGrade = (g: string) => {
    setForm((f) => ({
      ...f,
      grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : [...f.grades, g],
    }));
  };

  const validateStep1 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = t("signup.err.firstName");
    if (!form.lastName.trim()) e.lastName = t("signup.err.lastName");
    if (!form.email.includes("@")) e.email = t("signup.err.email");
    if (form.password.length < 8) e.password = t("signup.err.password");
    if (form.password !== form.confirmPassword) e.confirmPassword = t("signup.err.confirmPassword");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.schoolName.trim()) e.schoolName = t("signup.err.schoolName");
    if (form.grades.length === 0) e.grades = t("signup.err.grades");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) {
      if (!form.accountType) { setErrors({ accountType: t("signup.err.accountType") }); return; }
      navigate("/signup/plan");
      return;
    }
    setStep((s) => (s + 1) as Step);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left — photo panel */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img src={classroomPhoto} alt="Classe de lecture" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.75) 0%, rgba(0,74,173,0.45) 50%, rgba(0,74,173,0.82) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BookOpen size={36} color="white" />
            <span style={{ fontSize: 22, fontWeight: 700, color: "white" }}>{t("common.appName")}</span>
          </div>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              {t("signup.hero.gradeRange")}
            </p>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "white", lineHeight: 1.3, marginBottom: 16, maxWidth: 380 }}>
              {t("signup.hero.title")}
            </h2>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "16px 20px", backdropFilter: "blur(4px)", maxWidth: 380 }}>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
                {t("signup.hero.quote")}
              </p>
              <p style={{ color: "#c9e265", fontSize: 12, fontWeight: 600, marginTop: 8, marginBottom: 0 }}>{t("signup.hero.quoteAuthor")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div style={{ flex: 1, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative", overflowY: "auto" }}>
        {/* Top bar */}
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ marginBottom: -12 }}><LangToggle className="" /></div>
        </div>
        <div style={{ position: "absolute", top: 24, left: 40 }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
            <ArrowLeft size={14} /> {t("signup.backHome")}
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: 460, paddingTop: 40 }}>
          <StepIndicator
            current={step}
            total={3}
            label={tp("signup.stepOf", { current: step, total: 3 })}
          />

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#004aad", margin: "0 0 4px" }}>{stepTitles[step - 1].title}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>{stepTitles[step - 1].subtitle}</p>

          {/* Step 1 — Personal info */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InputField label={t("profile.firstName")} value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="Sophie" error={errors.firstName} />
                <InputField label={t("profile.lastName")} value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Pelletier" error={errors.lastName} />
              </div>
              <InputField label={t("signup.email")} type="email" value={form.email} onChange={(v) => set("email", v)} placeholder={t("signup.emailPlaceholder")} error={errors.email} />
              <InputField label={t("signup.password")} type="password" value={form.password} onChange={(v) => set("password", v)} placeholder={t("signup.passwordPlaceholder")} error={errors.password} />
              <InputField label={t("signup.confirmPassword")} type="password" value={form.confirmPassword} onChange={(v) => set("confirmPassword", v)} placeholder={t("signup.confirmPlaceholder")} error={errors.confirmPassword} />
              <div style={{ background: "#dff3ff", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#004aad" }}>
                🔒 {t("signup.passwordHint")}
              </div>
            </div>
          )}

          {/* Step 2 — School profile */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <InputField label={t("signup.schoolName")} value={form.schoolName} onChange={(v) => set("schoolName", v)} placeholder={t("signup.schoolNamePlaceholder")} error={errors.schoolName} />
              <InputField label={t("signup.schoolBoard")} value={form.schoolBoard} onChange={(v) => set("schoolBoard", v)} placeholder={t("signup.schoolBoardPlaceholder")} />
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{t("signup.province")}</label>
                <select value={form.province} onChange={(e) => set("province", e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", color: "#1e293b" }}>
                  {provinces.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{t("signup.role")}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {roles.map((r) => (
                    <button key={r.value} type="button" onClick={() => set("role", r.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                        border: `1.5px solid ${form.role === r.value ? "#004aad" : "#dff3ff"}`,
                        background: form.role === r.value ? "#dff3ff" : "#f8ffdb",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}>
                      <r.icon size={16} color={form.role === r.value ? "#004aad" : "#94a3b8"} />
                      <span style={{ fontSize: 13, fontWeight: form.role === r.value ? 600 : 400, color: form.role === r.value ? "#004aad" : "#374151" }}>{r.label}</span>
                      {form.role === r.value && <Check size={14} color="#004aad" style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  {t("signup.gradesTaught")} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{t("signup.gradesHint")}</span>
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {grades.map((g) => {
                    const selected = form.grades.includes(g.value);
                    return (
                      <button key={g.value} type="button" onClick={() => toggleGrade(g.value)}
                        style={{
                          padding: "7px 14px", borderRadius: 20,
                          border: `1.5px solid ${selected ? "#004aad" : "#dff3ff"}`,
                          background: selected ? "#004aad" : "#f8ffdb",
                          color: selected ? "white" : "#374151",
                          fontSize: 13, fontWeight: selected ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                        }}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
                {errors.grades && <p style={{ fontSize: 12, color: "#ff5757", marginTop: 5 }}>{errors.grades}</p>}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  {t("signup.numStudents")} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{t("signup.optional")}</span>
                </label>
                <input type="number" min={1} max={200} value={form.numStudents} onChange={(e) => set("numStudents", e.target.value)}
                  placeholder={t("signup.studentsPlaceholder")}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          )}

          {/* Step 3 — Account type */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
                {t("signup.accountQuestion")}
              </p>
              {accountOptions.map((opt) => {
                const selected = form.accountType === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => set("accountType", opt.value)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 20px", borderRadius: 14,
                      border: `2px solid ${selected ? "#004aad" : "#dff3ff"}`,
                      background: selected ? "#dff3ff" : "#f8ffdb",
                      cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                    }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: selected ? "#004aad" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #dff3ff" }}>
                      <opt.icon size={18} color={selected ? "white" : "#004aad"} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: selected ? "#004aad" : "#1e293b" }}>{opt.title}</span>
                        {opt.badge && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#ecfdf5", color: "#059669" }}>{opt.badge}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{opt.desc}</p>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected ? "#004aad" : "#cbd5e1"}`, background: selected ? "#004aad" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                    </div>
                  </button>
                );
              })}
              {errors.accountType && <p style={{ fontSize: 12, color: "#ff5757" }}>{errors.accountType}</p>}

              {form.accountType === "school" && (
                <div style={{ background: "#ecfdf5", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#374151" }}>
                  ✅ {t("signup.schoolNotify")}
                </div>
              )}
              {form.accountType === "individual" && (
                <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#374151" }}>
                  💳 {t("signup.individualNotify")}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => (s - 1) as Step)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#004aad", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ArrowLeft size={15} /> {t("common.back")}
              </button>
            )}
            <button type="button" onClick={handleNext}
              style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "#004aad", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {step === 3 ? t("signup.continueToPlans") : t("signup.continue")}
              <ArrowRight size={15} />
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: 20 }}>
            {t("signup.hasAccount")}{" "}
            <button onClick={() => navigate("/signin")} style={{ color: "#38b6ff", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
              {t("login.signIn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
