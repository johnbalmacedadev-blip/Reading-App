import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail, CheckCircle2, Send } from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { BrandMark } from "../components/BrandMark";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { authApi, ApiError } from "../api/client";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sentSteps = useMemo(
    () => [t("forgot.sent.step1"), t("forgot.sent.step2"), t("forgot.sent.step3")],
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError(t("forgot.err.email"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.csrf();
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : t("forgot.err.email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img src={classroomPhoto} alt="Classe" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.72) 0%, rgba(0,74,173,0.45) 50%, rgba(0,74,173,0.80) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <BrandMark height={48} onDark />
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1.3, marginBottom: 12, maxWidth: 360 }}>
              {t("forgot.hero.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
              {t("forgot.hero.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ marginBottom: -12 }}><LangToggle className="" /></div>
        </div>

        <div style={{ width: "100%", maxWidth: 400 }}>
          {!sent ? (
            <>
              <button
                onClick={() => navigate("/signin")}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 32 }}
              >
                <ArrowLeft size={14} /> {t("forgot.backToSignIn")}
              </button>

              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#dff3ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Mail size={24} color="#004aad" />
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#004aad", margin: "0 0 6px" }}>
                {t("forgot.title")}
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
                {t("forgot.subtitle")}
              </p>

              {error && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e11d48", marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    {t("forgot.email")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} color="#94a3b8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder={t("login.emailPlaceholder")}
                      required
                      autoFocus
                      style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "#f8ffdb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: 12,
                    border: "none",
                    background: loading ? "#94a3b8" : "#004aad",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background 0.2s",
                  }}
                >
                  <Send size={15} />
                  {loading ? t("forgot.sending") : t("forgot.submit")}
                </button>
              </form>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
                <p style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
                  {t("forgot.rememberPassword")}{" "}
                  <button
                    onClick={() => navigate("/signin")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#004aad", fontWeight: 700, fontSize: 13 }}
                  >
                    {t("login.signIn")}
                  </button>
                </p>
                <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {t("forgot.noAccount")}{" "}
                  <button
                    onClick={() => navigate("/signup")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#38b6ff", fontWeight: 600, fontSize: 13 }}
                  >
                    {t("login.createAccount")}
                  </button>
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 size={34} color="#059669" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>{t("forgot.sent.title")}</h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 8, lineHeight: 1.6 }}>
                {t("forgot.sent.subtitle")}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#004aad", marginBottom: 24 }}>{email}</p>

              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", textAlign: "left", marginBottom: 28 }}>
                {sentSteps.map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < sentSteps.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#dff3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#004aad" }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "white", color: "#004aad", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
              >
                {t("forgot.resend")}
              </button>
              <button
                onClick={() => navigate("/signin")}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#004aad", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                {t("forgot.backToSignIn")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
