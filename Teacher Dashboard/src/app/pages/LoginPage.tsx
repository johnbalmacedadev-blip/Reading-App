import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen,
  GraduationCap,
  School,
  Building2,
  ArrowRight,
  Settings,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";

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
  const { t } = useLanguage();
  const portals = useMemo(
    () =>
      portalDefs.map((portal) => ({
        ...portal,
        label: t(portal.labelKey),
        description: t(portal.descriptionKey),
      })),
    [t]
  );
  const [selectedPortal, setSelectedPortal] = useState<
    string | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const portal = portals.find((p) => p.id === selectedPortal);
    navigate(portal?.route ?? "/dashboard");
  };

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
            onClick={() => navigate("/admin")}
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

                  <button
                    key={id}
                    onClick={() => setSelectedPortal(id)}
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
                ))}
              </div>

              {/* Sign up CTA */}
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid #f1f5f9" }}>
                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  {t("login.newTeacher")}{" "}
                  <button
                    onClick={() => navigate("/signup")}
                    className="font-semibold"
                    style={{ color: "#004aad", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
                  >
                    {t("login.createAccountArrow")}
                  </button>
                </p>
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
                    {activePortal?.id === "enseignant"
                      ? t("login.teacherPortal")
                      : activePortal?.id === "ecole"
                        ? t("login.schoolPortal")
                        : t("login.boardPortal")}
                  </h2>
                </div>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#333" }}
                  >
                    {t("login.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      background: "#f8ffdb",
                      borderColor: "#dff3ff",
                    }}
                    placeholder={t("login.emailPlaceholder")}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#333" }}
                  >
                    {t("login.password")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      background: "#f8ffdb",
                      borderColor: "#dff3ff",
                    }}
                    placeholder="••••••••"
                  />
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
                  className="w-full py-3 rounded-xl font-semibold transition-all"
                  style={{
                    background: "#004aad",
                    color: "#ffffff",
                  }}
                >
                  {t("login.signIn")}
                </button>

                <div className="flex flex-col justify-between">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div
                        className="w-full border-t"
                        style={{ borderColor: "#e5e7eb" }}
                      />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span
                        className="px-3 bg-white"
                        style={{ color: "#999" }}
                      >
                        {t("common.or")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3 rounded-xl border flex items-center justify-center gap-2 transition-all hover:bg-gray-50"
                    style={{
                      borderColor: "#e5e7eb",
                      color: "#333",
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {t("login.signInGoogle")}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}