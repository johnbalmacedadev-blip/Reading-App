import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, ArrowLeft, Check, ArrowRight, Sparkles, Lock,
  BarChart3, Users, FileText, Bell, Download, Headphones, Gift,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

type PlanId = "essentials" | "insights" | "trial";

export function SubscriptionPlanPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selected, setSelected] = useState<PlanId>("trial");

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
        tagline: t("plan.essentials.tagline"),
        price: "19",
        period: t("plan.perMonth"),
        annualPrice: "16",
        annualNote: t("plan.essentials.annualNote"),
        color: "#004aad",
        bg: "#dff3ff",
        popular: false,
        comingSoon: false,
        features: [
          { icon: Users, text: t("plan.essentials.f1") },
          { icon: BarChart3, text: t("plan.essentials.f2") },
          { icon: FileText, text: t("plan.essentials.f3") },
          { icon: BookOpen, text: t("plan.essentials.f4") },
          { icon: Bell, text: t("plan.essentials.f5") },
          { icon: Download, text: t("plan.essentials.f6") },
          { icon: Headphones, text: t("plan.essentials.f7") },
        ],
        missing: [t("plan.essentials.m1"), t("plan.essentials.m2"), t("plan.essentials.m3")],
      },
      {
        id: "insights" as const,
        name: t("plan.insights.name"),
        tagline: t("plan.insights.tagline"),
        price: "39",
        period: t("plan.perMonth"),
        annualPrice: "32",
        annualNote: t("plan.insights.annualNote"),
        color: "#7c3aed",
        bg: "#f3f0ff",
        popular: true,
        comingSoon: true,
        features: [
          { icon: Users, text: t("plan.insights.f1") },
          { icon: BarChart3, text: t("plan.insights.f2") },
          { icon: FileText, text: t("plan.insights.f3") },
          { icon: BookOpen, text: t("plan.insights.f4") },
          { icon: Bell, text: t("plan.insights.f5") },
          { icon: Download, text: t("plan.insights.f6") },
          { icon: Headphones, text: t("plan.insights.f7") },
        ],
        missing: [] as string[],
      },
    ],
    [t]
  );

  const trialFeatures = useMemo(
    () => [t("plan.trial.f1"), t("plan.trial.f2"), t("plan.trial.f3")],
    [t]
  );

  const handleContinue = () => {
    if (selected === "essentials" || selected === "trial") {
      navigate("/signup/payment");
    }
  };

  const continueLabel =
    selected === "trial" ? t("plan.continue7") : t("plan.continue14");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 340, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={classroomPhoto} alt="Classe" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.78) 0%, rgba(0,74,173,0.5) 50%, rgba(0,74,173,0.85) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={28} color="white" />
            <span style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{t("common.appName")}</span>
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
            onClick={() => navigate("/signup")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 28 }}
          >
            <ArrowLeft size={14} /> {t("common.back")}
          </button>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#004aad", margin: 0 }}>{t("plan.title")}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 24 }}>{t("plan.subtitle")}</p>

          <div style={{ display: "inline-flex", background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: 4, marginBottom: 28 }}>
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: billing === b ? "#004aad" : "transparent",
                  color: billing === b ? "white" : "#64748b",
                }}
              >
                {b === "monthly" ? t("plan.monthly") : t("plan.annual")}
                {b === "annual" && (
                  <span style={{ marginLeft: 6, fontSize: 10, background: "#c9e265", color: "#1a3a00", borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>
                    -18%
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {plans.map((plan) => {
              const isSelected = selected === plan.id;
              const price = billing === "annual" ? plan.annualPrice : plan.price;
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
                  }}
                >
                  {plan.popular && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 10, whiteSpace: "nowrap", letterSpacing: 0.5 }}>
                      {t("plan.comingSoon")}
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
                    <span style={{ fontSize: 34, fontWeight: 800, color: plan.color }}>{price} $</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{plan.period}</span>
                    {billing === "annual" && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>{plan.annualNote}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
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
                    <div style={{ marginTop: 14, padding: "6px 0", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 5 }}>
                      <Check size={13} color={plan.color} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: plan.color }}>{t("plan.selected")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 7-day free trial section */}
          <div
            onClick={() => setSelected("trial")}
            style={{
              background: selected === "trial" ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)" : "white",
              borderRadius: 18,
              padding: "24px 28px",
              border: `2px solid ${selected === "trial" ? "#059669" : "#e2e8f0"}`,
              cursor: "pointer",
              transition: "all 0.2s",
              marginBottom: 28,
              boxShadow: selected === "trial" ? "0 0 0 4px rgba(5,150,105,0.12)" : "0 1px 4px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Gift size={24} color="white" />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, background: "#c9e265", color: "#1a3a00", padding: "3px 10px", borderRadius: 8 }}>
                  {t("plan.trial.badge")}
                </span>
                {selected === "trial" && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={13} /> {t("plan.selected")}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>{t("plan.trial.title")}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{t("plan.trial.subtitle")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {trialFeatures.map((feature) => (
                  <div key={feature} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={13} color="#059669" />
                    <span style={{ fontSize: 12, color: "#374151" }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#059669", lineHeight: 1 }}>{t("plan.trial.price")}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t("plan.trial.duration")}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
            <button
              onClick={handleContinue}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: selected === "trial" ? "#059669" : "#004aad",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {continueLabel}
              <ArrowRight size={16} />
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
