import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BookOpen, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { authApi, ApiError } from "../api/client";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const invalidLink = useMemo(() => !token || !email, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("signup.err.password"));
      return;
    }
    if (password !== confirm) {
      setError(t("signup.err.confirmPassword"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.csrf();
      await authApi.resetPassword({
        token,
        email,
        password,
        password_confirmation: confirm,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <LangToggle className="" />
      </div>
      <div style={{ background: "white", borderRadius: 20, padding: "40px 44px", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,74,173,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <BookOpen size={22} color="#004aad" />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#004aad" }}>{t("common.appName")}</span>
        </div>

        {done ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <CheckCircle2 size={28} color="#059669" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>{t("reset.successTitle")}</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>{t("reset.successBody")}</p>
            <button
              onClick={() => navigate("/signin")}
              style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#004aad", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {t("login.signIn")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/signin")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 20, padding: 0 }}
            >
              <ArrowLeft size={14} /> {t("forgot.backToSignIn")}
            </button>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#dff3ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Lock size={22} color="#004aad" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#004aad", margin: "0 0 6px" }}>{t("reset.title")}</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 22 }}>{t("reset.subtitle")}</p>

            {invalidLink && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e11d48", marginBottom: 16 }}>
                {t("reset.invalidLink")}
              </div>
            )}
            {error && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e11d48", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{t("signup.email")}</label>
                <input value={email} readOnly style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, boxSizing: "border-box", color: "#64748b" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{t("signup.password")}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("signup.passwordPlaceholder")}
                    required
                    disabled={invalidLink}
                    style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{t("signup.confirmPassword")}</label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("signup.confirmPlaceholder")}
                  required
                  disabled={invalidLink}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || invalidLink}
                style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: loading || invalidLink ? "#94a3b8" : "#004aad", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
              >
                {loading ? t("payment.processing") : t("reset.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
