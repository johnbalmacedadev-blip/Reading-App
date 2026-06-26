import { useState } from "react";
import { useNavigate } from "react-router";
import { BookOpen, Eye, EyeOff, ArrowRight } from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function TeacherSignInPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login.fillAllFields"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BookOpen size={36} color="white" />
            <span style={{ fontSize: 22, fontWeight: 700, color: "white" }}>{t("common.appName")}</span>
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

            {/* Divider */}
            <div style={{ position: "relative", margin: "2px 0" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
                <div style={{ width: "100%", borderTop: "1px solid #e5e7eb" }} />
              </div>
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <span style={{ padding: "0 12px", background: "white", fontSize: 12, color: "#94a3b8" }}>{t("common.or")}</span>
              </div>
            </div>

            <button type="button"
              style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#374151" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}>
              <GoogleIcon />
              {t("login.signInGoogle")}
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
