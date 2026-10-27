import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { LangToggle } from "../../components/LangToggle";
import { useLanguage } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(username.trim(), password, "admin");
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg, #0a1628 0%, #004aad 55%, #0a1628 100%)",
      }}>
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <BrandMark height={48} onDark />
          </div>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(56,182,255,0.15)", borderRadius: 20,
              padding: "4px 12px", marginBottom: 16,
            }}>
              <ShieldCheck size={14} color="#38b6ff" />
              <span style={{ color: "#38b6ff", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>ADMIN PORTAL</span>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 12, maxWidth: 380 }}>
              Platform administration
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, maxWidth: 340, lineHeight: 1.6 }}>
              Manage schools, teachers, students, content, and platform settings.
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <LangToggle />
        </div>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #004aad, #38b6ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ShieldCheck size={20} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>Administrator</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", margin: 0 }}>Sign in</h2>
            </div>
          </div>

          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Enter your credentials to access the admin dashboard.
          </p>

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e11d48", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="admin"
                required
                autoComplete="username"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ width: "100%", padding: "12px 14px", paddingRight: 42, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: submitting ? "#64748b" : "#004aad", color: "white",
                fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 4,
              }}
            >
              {submitting ? "Signing in..." : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 24 }}>
            <button
              onClick={() => navigate("/")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#004aad", fontWeight: 600, fontSize: 13 }}
            >
              ← Back to main portal
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
