import { useNavigate } from "react-router";
import { AlertTriangle, Mail } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { LangToggle } from "./LangToggle";
import { useLanguage } from "../i18n";

/**
 * Shown after an individual teacher signs up. The account stays inactive until the
 * activation link in the email is clicked, so there is no session to load yet.
 */
export function SignupPendingActivation({ email, emailSent }: { email: string; emailSent: boolean }) {
  const navigate = useNavigate();
  const { t, tp } = useLanguage();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <LangToggle className="" />
      </div>
      <div style={{ background: "white", borderRadius: 20, padding: "48px 40px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,74,173,0.1)", boxSizing: "border-box" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: emailSent ? "#dff3ff" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          {emailSent ? <Mail size={32} color="#004aad" /> : <AlertTriangle size={32} color="#b45309" />}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <BrandMark height={28} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 12px" }}>
          {t("signup.pending.title")}
        </h2>
        <p style={{ fontSize: 15, color: "#475569", marginBottom: 12, lineHeight: 1.6 }}>
          {emailSent ? tp("signup.pending.body", { email }) : t("signup.pending.emailFailed")}
        </p>
        {emailSent && (
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.5 }}>
            {t("signup.pending.spam")}
          </p>
        )}
        <button
          onClick={() => navigate("/signin", { replace: true })}
          style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#004aad", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          {t("signup.pending.goToSignin")}
        </button>
      </div>
    </div>
  );
}
