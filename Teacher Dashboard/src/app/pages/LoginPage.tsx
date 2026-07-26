import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  BookOpen,
  GraduationCap,
  School,
  Building2,
  ArrowRight,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { teacherHomePath } from "../utils/teacherAccess";

const portalDefs = [
  {
    id: "enseignant",
    labelKey: "login.teacherPortal" as const,
    descriptionKey: "login.teacherDesc" as const,
    Icon: GraduationCap,
    route: "/dashboard",
    color: "#004aad",
    bg: "#dff3ff",
  },
  {
    id: "ecole",
    labelKey: "login.schoolPortal" as const,
    descriptionKey: "login.schoolDesc" as const,
    Icon: School,
    route: "/school",
    color: "#004aad",
    bg: "#f7ffd6",
  },
  {
    id: "conseil",
    labelKey: "login.boardPortal" as const,
    descriptionKey: "login.boardDesc" as const,
    Icon: Building2,
    route: "/board",
    color: "#004aad",
    bg: "#fff0f0",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, loading, login } = useAuth();
  const portals = useMemo(
    () =>
      portalDefs.map((portal) => ({
        ...portal,
        label: t(portal.labelKey),
        description: t(portal.descriptionKey),
      })),
    [t]
  );
  const [selectedPortal, setSelectedPortal] = useState<string | null>(() => {
    const portal = (location.state as { portal?: string } | null)?.portal;
    return portal && portal !== "enseignant" ? portal : null;
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "board_admin") navigate("/board", { replace: true });
    else if (user.role === "school_admin") navigate("/school", { replace: true });
    else if (user.role === "teacher") navigate(teacherHomePath(user), { replace: true });
    else if (user.role === "admin") navigate("/admin", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const portal = (location.state as { portal?: string } | null)?.portal;
    if (portal === "enseignant") {
      navigate("/signin", { replace: true });
    }
  }, [location.state, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPortal === "ecole") {
      if (!email || !password) {
        setError(t("login.fillAllFields"));
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        await login(email, password, "school");
        navigate("/school");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("login.loginFailed"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (selectedPortal === "conseil") {
      if (!email || !password) {
        setError(t("login.fillAllFields"));
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        await login(email, password, "board");
        navigate("/board");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("login.loginFailed"));
      } finally {
        setSubmitting(false);
      }
      return;
    }
  };

  const usesPortalLogin = selectedPortal === "ecole" || selectedPortal === "conseil";

  const activePortal = portals.find(
    (p) => p.id === selectedPortal,
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Photo with overlay */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src={classroomPhoto}
          alt="Enseignante en classe de maternelle faisant une leçon de phonétique en français"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,74,173,0.72) 0%, rgba(0,74,173,0.45) 50%, rgba(0,74,173,0.80) 100%)",
          }}
        />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <BookOpen className="w-9 h-9 text-white" />
            <h1 className="text-2xl font-semibold text-white">
              {t("common.appName")}
            </h1>
          </div>
          <div>
            <p className="text-white/80 text-sm mb-3 uppercase tracking-widest font-medium">
              {t("login.gradeRange")}
            </p>
            <h2 className="text-3xl font-bold text-white leading-snug mb-4">
              {t("login.tagline")}
            </h2>
            <p className="text-white/75 text-base max-w-sm">
              {t("login.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 bg-white flex items-center justify-center p-12 relative">
        <div className="absolute top-6 right-6" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Wrapper cancels the mb-3 LangToggle always applies */}
          <div style={{ marginBottom: -12 }}>
            <LangToggle className="" />
          </div>
          <button
            onClick={() => navigate("/admin/login")}
            title="Admin portal"
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#94a3b8", transition: "all 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1";
              (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              (e.currentTarget as HTMLButtonElement).style.background = "white";
            }}
          >
            <Settings size={15} />
          </button>
        </div>
        <div className="w-full max-w-md">
          {!selectedPortal ? (
            /* Portal selection */
            <>
              <div className="mb-10">
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{ color: "#004aad" }}
                >
                  {t("login.welcome")}
                </h2>
                <p
                  className="text-base"
                  style={{ color: "#555" }}
                >
                  {t("login.choosePortal")}
                </p>
              </div>

              <div className="space-y-4">
                {portals.map(({ id, Icon, bg, color }) => (
                  <div key={id}>
                    <button
                      onClick={() => {
                        if (id === "enseignant") {
                          navigate("/signin");
                          return;
                        }
                        setSelectedPortal(id);
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:shadow-md group"
                      style={{
                        background: bg,
                        border: `1.5px solid ${bg === "#dff3ff" ? "#b8e4ff" : bg === "#f7ffd6" ? "#c9e265" : "#ffd0d0"}`,
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: color }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p
                          className="font-bold text-base"
                          style={{ color }}
                        >
                          {id === "enseignant"
                            ? t("login.teacherPortal")
                            : id === "ecole"
                              ? t("login.schoolPortal")
                              : t("login.boardPortal")}
                        </p>
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: "#666" }}
                        >
                          {id === "enseignant"
                            ? t("login.teacherDesc")
                            : id === "ecole"
                              ? t("login.schoolDesc")
                              : t("login.boardDesc")}
                        </p>
                      </div>
                      <ArrowRight
                        className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity"
                        style={{ color }}
                      />
                    </button>

                    {id === "enseignant" && (
                      <p className="text-center text-sm mt-3" style={{ color: "#94a3b8" }}>
                        {t("login.newTeacher")}{" "}
                        <button
                          onClick={() => navigate("/signup")}
                          className="font-semibold"
                          style={{ color: "#004aad", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
                        >
                          {t("login.createAccountArrow")}
                        </button>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Login form for selected portal */
            <>
              <button
                onClick={() => setSelectedPortal(null)}
                className="flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity"
                style={{ color: "#004aad" }}
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t("login.changePortal")}
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#004aad" }}
                >
                  {activePortal && (
                    <activePortal.Icon className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-widest font-medium"
                    style={{ color: "#888" }}
                  >
                    {t("login.loginTitle")}
                  </p>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: "#004aad" }}
                  >
                    {activePortal?.id === "ecole"
                      ? t("login.schoolPortal")
                      : t("login.boardPortal")}
                  </h2>
                </div>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#e11d48",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#333" }}
                  >
                    {usesPortalLogin ? t("login.username") : t("login.email")}
                  </label>
                  <input
                    type={usesPortalLogin ? "text" : "email"}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      background: "#f8ffdb",
                      borderColor: "#dff3ff",
                    }}
                    placeholder={
                      usesPortalLogin
                        ? t("login.schoolUsernamePlaceholder")
                        : t("login.emailPlaceholder")
                    }
                    required={usesPortalLogin}
                    autoComplete={usesPortalLogin ? "username" : "email"}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#333" }}
                  >
                    {t("login.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="w-full px-4 py-3 pr-12 rounded-xl border"
                      style={{
                        background: "#f8ffdb",
                        borderColor: "#dff3ff",
                      }}
                      placeholder="••••••••"
                      required={usesPortalLogin}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm"
                    style={{ color: "#38b6ff", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {t("login.forgotPassword")}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold transition-all"
                  style={{
                    background: submitting ? "#64748b" : "#004aad",
                    color: "#ffffff",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? t("login.signingIn") : t("login.signIn")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}