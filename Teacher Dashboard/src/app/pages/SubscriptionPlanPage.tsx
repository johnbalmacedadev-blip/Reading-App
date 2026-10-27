import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, ArrowLeft, Check, ArrowRight, Sparkles, Lock,
  BarChart3, Users, FileText, Bell, Download, Headphones,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { BrandMark } from "../components/BrandMark";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { clearSignupDraft, saveSignupDraft, loadSignupDraft } from "../signupDraft";
import { ApiError, authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

type PlanId = "essentials" | "insights";

export function SubscriptionPlanPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { refreshUser } = useAuth();
  const [selected, setSelected] = useState<PlanId>("essentials");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const includedFeatures = useMemo(
    () => [
      t("plan.included1"),
      t("plan.included2"),
      t("plan.included3"),
      t("plan.included4"),
      t("plan.included5"),
    ],
    [t]
  );

  const plans = useMemo(
    () => [
      {
        id: "essentials" as const,
        name: t("plan.essentials.name"),
        tagline: "Everything you need to teach with Lecture Scientifique.",
        price: "14.99",
        period: t("plan.perMonth"),
        annualPrice: "14.99",
        annualNote: t("plan.essentials.annualNote"),
        color: "#004aad",
        bg: "#dff3ff",
        popular: false,
        comingSoon: false,
        features: [
          { icon: Users, text: "Up to 30 students" },
          { icon: BookOpen, text: "Full Lecture Scientifique curriculum (15 workshops)" },
          { icon: BookOpen, text: "Teacher resource library" },
          { icon: Headphones, text: "Email support (48-hour response)" },
        ],
        missing: [
          "Student management",
          "Classroom management",
          "Progress tracking",
          "Reports and analytics",
          "Smart alerts",
          "School-wide dashboards",
          "Priority email support",
        ],
      },
      {
        id: "insights" as const,
        name: t("plan.insights.name"),
        tagline: "Everything in Essentials, plus the complete classroom management and reporting platform.",
        price: "19.99",
        period: t("plan.perMonth"),
        annualPrice: "19.99",
        annualNote: t("plan.insights.annualNote"),
        color: "#7c3aed",
        bg: "#f3f0ff",
        popular: true,
        comingSoon: false,
        features: [
          { icon: BookOpen, text: "Everything in Essentials" },
          { icon: Users, text: "Classroom management" },
          { icon: BarChart3, text: "Student progress tracking" },
          { icon: FileText, text: "Individual student reports" },
          { icon: FileText, text: "Class reports" },
          { icon: Download, text: "PDF & Excel report exports" },
          { icon: BarChart3, text: "Advanced analytics & trends" },
          { icon: BarChart3, text: "Cross-class and year-over-year comparisons" },
          { icon: BarChart3, text: "School-wide reporting dashboard" },
          { icon: Bell, text: "Personalized smart alerts" },
          { icon: Headphones, text: "Priority email support" },
        ],
        missing: [] as string[],
      },
    ],
    [t]
  );

  const handleContinue = async () => {
    const signup = loadSignupDraft();
    if (!signup?.form.email || !signup.form.password) {
      navigate("/signup");
      return;
    }

    setProcessing(true);
    setError("");
    try {
      await authApi.csrf();
      await authApi.completeSignup({
        first_name: signup.form.firstName,
        last_name: signup.form.lastName,
        email: signup.form.email,
        password: signup.form.password,
        password_confirmation: signup.form.confirmPassword || signup.form.password,
        school_name: signup.form.schoolName,
        school_board: signup.form.schoolBoard,
        account_type: signup.form.accountType || "individual",
        preferred_language: lang === "fr" ? "fr" : "en",
        plan: selected,
        billing: "monthly",
        due_today: "$0.00",
      });
      clearSignupDraft();
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to start the free trial.",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 340, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={classroomPhoto} alt="Classe" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.78) 0%, rgba(0,74,173,0.5) 50%, rgba(0,74,173,0.85) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 40 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <BrandMark height={48} onDark />
          </div>
          <div>
            <div style={{ background: "rgba(255,255,255,0.13)", borderRadius: 14, padding: "20px", backdropFilter: "blur(4px)", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c9e265", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                {t("plan.includedTitle")}
              </div>
              {includedFeatures.map((feature) => (
                <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#c9e265", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Check size={9} color="#1a3a00" />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{feature}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              {t("plan.securePayment")}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: "#f8fafc", display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <LangToggle className="" />
        </div>

        <div style={{ padding: "32px 40px 0" }}>
          <button
            onClick={() => {
              const draft = loadSignupDraft();
              if (draft) saveSignupDraft(2, draft.form);
              navigate("/signup");
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 28 }}
          >
            <ArrowLeft size={14} /> {t("common.back")}
          </button>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#004aad", margin: 0 }}>{t("plan.title")}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 24 }}>{t("plan.subtitle")}</p>
          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18, alignItems: "stretch" }}>
            {plans.map((plan) => {
              const isSelected = selected === plan.id;
              const price = plan.price;
              return (
                <div
                  key={plan.id}
                  onClick={() => !plan.comingSoon && setSelected(plan.id)}
                  style={{
                    background: "white",
                    borderRadius: 18,
                    padding: "24px",
                    border: `2px solid ${isSelected ? plan.color : "#e2e8f0"}`,
                    cursor: plan.comingSoon ? "default" : "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    opacity: plan.comingSoon ? 0.85 : 1,
                    boxShadow: isSelected ? `0 0 0 4px ${plan.bg}` : "0 1px 4px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  {plan.popular && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 10, whiteSpace: "nowrap", letterSpacing: 0.5 }}>
                      MOST COMPLETE
                    </div>
                  )}
                  {plan.comingSoon && (
                    <div style={{ position: "absolute", top: 16, right: 16 }}>
                      <Lock size={16} color="#94a3b8" />
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ background: plan.bg, borderRadius: 8, padding: 7 }}>
                      {plan.comingSoon ? <Sparkles size={15} color={plan.color} /> : <BarChart3 size={15} color={plan.color} />}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{plan.name}</div>
                  </div>

                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.4 }}>{plan.tagline}</p>

                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: plan.color }}>${price}</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{plan.period}</span>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      + 13% tax · Total ${(Number(price) * 1.13).toFixed(2)}/month
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                    {plan.features.map((f) => (
                      <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: plan.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <Check size={9} color={plan.color} />
                        </div>
                        <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{f.text}</span>
                      </div>
                    ))}
                    {plan.missing.map((feature) => (
                      <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 8, opacity: 0.4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <div style={{ width: 6, height: 1, background: "#94a3b8" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, textDecoration: "line-through" }}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isSelected && !plan.comingSoon && (
                    <div style={{ marginTop: "auto", padding: "14px 0 0", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 5 }}>
                      <Check size={13} color={plan.color} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: plan.color }}>{t("plan.selected")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, paddingBottom: 16, marginTop: 10 }}>
            <button
              onClick={handleContinue}
              disabled={processing}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: "#004aad",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: processing ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {processing ? "Creating your account…" : "Start 30-day free trial — No credit card to get started"}
              {!processing && <ArrowRight size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", paddingBottom: 32 }}>
            {t("plan.footerNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
