import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BookOpen, Eye, EyeOff, ArrowRight } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import classroomPhoto from "../../imports/image-1.png";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { teacherHomePath } from "../utils/teacherAccess";

export function TeacherSignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const activation = searchParams.get("activation");
    if (activation === "success") {
      setInfo(t("login.activationSuccess") || "Your account is activated. You can sign in now.");
    } else if (activation === "invalid" || activation === "archived") {
      setError(t("login.activationInvalid") || "This activation link is invalid or expired.");
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (!loading && user?.role === "teacher") {
      navigate(teacherHomePath(user), { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login.fillAllFields"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const loggedIn = await login(email, password, "teacher");
      navigate(teacherHomePath(loggedIn));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left — photo */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img src={classroomPhoto} alt="Classe" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.72) 0%, rgba(0,74,173,0.45) 50%, rgba(0,74,173,0.80) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <BrandMark height={48} onDark />
          </div>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              {t("login.gradeRange")}
            </p>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "white", lineHeight: 1.3, marginBottom: 12, maxWidth: 380 }}>
              {t("login.tagline")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, maxWidth: 340, lineHeight: 1.6 }}>
              {t("login.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ marginBottom: -12 }}><LangToggle className="" /></div>
        </div>

        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Icon + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#004aad", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>{t("login.teacherPortalLabel")}</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#004aad", margin: 0 }}>{t("login.loginTitle")}</h2>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            {t("login.welcomeBack")}
          </p>

          {info && (
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#047857", marginBottom: 16 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e11d48", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {t("login.email")}
              </label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder={t("login.emailPlaceholder")} required
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {t("login.password")}
              </label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••" required
                  style={{ width: "100%", padding: "12px 14px", paddingRight: 42, borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => navigate("/forgot-password")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#38b6ff", fontWeight: 500 }}>
                {t("login.forgotPassword")}
              </button>
            </div>

            <button type="submit" disabled={submitting}
              style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: submitting ? "#64748b" : "#004aad", color: "white", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {submitting ? t("login.signingIn") : t("login.signIn")}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: 0 }}>
              {t("login.noAccount")}{" "}
              <button onClick={() => navigate("/signup")} style={{ background: "none", border: "none", cursor: "pointer", color: "#004aad", fontWeight: 700, fontSize: 13 }}>
                {t("login.createAccount")}
              </button>
            </p>
            <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: 0 }}>
              {t("login.schoolBoardAccess")}{" "}
              <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "#38b6ff", fontWeight: 600, fontSize: 13 }}>
                {t("login.choosePortalLink")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
