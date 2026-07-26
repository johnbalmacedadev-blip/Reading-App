import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { TeacherLayout } from "../components/TeacherLayout";
import {
  teacherSubscriptionApi,
  type TeacherSubscription,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

type PlanId = "essentials" | "insights";

const plans = [
  {
    id: "essentials" as const,
    name: "Essentials",
    description: "Everything you need to teach with Lecture Scientifique.",
    price: 14.99,
    features: [
      "Full Lecture Scientifique curriculum (15 workshops)",
      "Teacher resource library",
      "Email support (48-hour response)",
    ],
    excluded: [
      "Student management",
      "Classroom management",
      "Progress tracking",
      "Reports and analytics",
      "Smart alerts",
      "School-wide dashboards",
      "Priority email support",
    ],
    color: "#004aad",
  },
  {
    id: "insights" as const,
    name: "Insights",
    description: "Everything in Essentials, plus the complete classroom management and reporting platform.",
    price: 19.99,
    features: [
      "Everything in Essentials",
      "Unlimited students",
      "Classroom management",
      "Student progress tracking",
      "Individual student reports",
      "Class reports",
      "PDF & Excel report exports",
      "Advanced analytics & trends",
      "Cross-class and year-over-year comparisons",
      "School-wide reporting dashboard",
      "Personalized smart alerts",
      "Priority email support",
    ],
    excluded: [],
    color: "#7c3aed",
  },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(value));
}

export function TeacherSubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<TeacherSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("insights");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<PlanId | "portal" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const result = await teacherSubscriptionApi.get();
    setSubscription(result.subscription);
    if (result.subscription.plan === "essentials" || result.subscription.plan === "insights") {
      setSelectedPlan(result.subscription.plan);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError("");
      try {
        const checkout = searchParams.get("checkout");
        const sessionId = searchParams.get("session_id");

        if (checkout === "success" && sessionId) {
          const result = await teacherSubscriptionApi.confirm(sessionId);
          setSubscription(result.subscription);
          setNotice(
            result.subscription.plan === "insights"
              ? "Your Insights subscription is active. Classroom tools and Reports are unlocked."
              : "Your Essentials subscription is active.",
          );
          await refreshUser();
          setSearchParams({}, { replace: true });
        } else {
          await load();
          if (checkout === "cancelled") {
            setNotice("Checkout was cancelled. Your free trial is unchanged.");
            setSearchParams({}, { replace: true });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load subscription.");
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [load, refreshUser, searchParams, setSearchParams]);

  const startCheckout = async (plan: PlanId) => {
    setSelectedPlan(plan);
    setProcessing(plan);
    setError("");
    try {
      const { checkout_url } = await teacherSubscriptionApi.checkout(plan);
      window.location.assign(checkout_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open Stripe Checkout.");
      setProcessing(null);
    }
  };

  const manageBilling = async () => {
    setProcessing("portal");
    setError("");
    try {
      const { portal_url } = await teacherSubscriptionApi.portal();
      window.location.assign(portal_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing management.");
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <TeacherLayout activeNav="subscription">
        <div className="h-full flex items-center justify-center gap-2" style={{ color: "#004aad" }}>
          <Loader2 size={20} className="animate-spin" /> Loading subscription…
        </div>
      </TeacherLayout>
    );
  }

  const active = Boolean(subscription?.is_active);
  const trialActive = Boolean(subscription?.is_trial_active);

  return (
    <TeacherLayout activeNav="subscription" contentClassName="flex-1 overflow-y-auto p-10">
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: "#004aad", fontSize: 30, fontWeight: 800, margin: "0 0 5px" }}>
            Choose Your Plan
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Start free for 30 days — no credit card required.
          </p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success"><CheckCircle2 size={16} /> {notice}</Alert>}

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 18, marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: active ? "#ecfdf5" : "#dff3ff", color: active ? "#059669" : "#004aad", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {active ? <ShieldCheck size={21} /> : <CalendarDays size={21} />}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.7 }}>Current status</div>
              <div style={{ fontSize: 17, fontWeight: 750, color: "#1e293b" }}>
                {active
                  ? `${subscription?.plan === "insights" ? "Insights" : "Essentials"} subscription`
                  : trialActive
                    ? `${subscription?.trial_days_remaining ?? 0} days remaining in free trial`
                    : "Free trial expired"}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {active
                  ? `Renews / ends ${formatDate(subscription?.subscription_ends_at ?? null)}`
                  : `Trial ends ${formatDate(subscription?.trial_ends_at ?? null)}`}
              </div>
            </div>
          </div>
          {active && (
            <button onClick={manageBilling} disabled={processing !== null} style={secondaryButtonStyle}>
              {processing === "portal" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
              Manage billing in Stripe
            </button>
          )}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>
          {plans.map((plan) => {
            const tax = plan.price * 0.13;
            const total = plan.price + tax;
            const isCurrent = active && subscription?.plan === plan.id;
            const selected = selectedPlan === plan.id;

            return (
              <section
                key={plan.id}
                onClick={() => !active && setSelectedPlan(plan.id)}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: `2px solid ${isCurrent || selected ? plan.color : "#e2e8f0"}`,
                  padding: 24,
                  boxShadow: isCurrent || selected ? `0 7px 24px ${plan.color}18` : "0 2px 10px rgba(15,23,42,0.04)",
                  cursor: active ? "default" : "pointer",
                  position: "relative",
                }}
              >
                {(isCurrent || (!active && selected)) && (
                  <div style={{ position: "absolute", top: -12, right: 20, background: plan.color, color: "white", borderRadius: 999, padding: "4px 12px", fontSize: 10, fontWeight: 750, letterSpacing: 0.5 }}>
                    {isCurrent ? "CURRENT PLAN" : "SELECTED"}
                  </div>
                )}
                <h2 style={{ fontSize: 22, color: plan.color, margin: "0 0 6px" }}>{plan.name}</h2>
                <p style={{ minHeight: 42, color: "#64748b", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>{plan.description}</p>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 850, color: "#1e293b" }}>{money(plan.price)}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>/month + tax</span>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 9, padding: "9px 11px", marginBottom: 18, fontSize: 11, color: "#64748b" }}>
                  13% tax: {money(tax)} · Total: <strong style={{ color: "#334155" }}>{money(total)}/month</strong>
                </div>

                {plan.features.map((feature) => (
                  <Feature key={feature} included>{feature}</Feature>
                ))}

                {plan.excluded.length > 0 && (
                  <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 750, color: "#64748b", marginBottom: 9 }}>NOT INCLUDED</div>
                    {plan.excluded.map((feature) => <Feature key={feature}>{feature}</Feature>)}
                  </div>
                )}

                {!active && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void startCheckout(plan.id);
                    }}
                    disabled={processing !== null}
                    style={{ ...primaryButtonStyle, background: plan.color }}
                  >
                    {processing === plan.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Subscribe to {plan.name}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, margin: "18px 0 4px" }}>
          Secure payment through Stripe · Prices shown in CAD · 13% tax applied at checkout
        </p>
      </div>
    </TeacherLayout>
  );
}

function Feature({ included = false, children }: { included?: boolean; children: string }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8, color: included ? "#334155" : "#94a3b8", fontSize: 12.5, lineHeight: 1.4 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: included ? "#ecfdf5" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {included ? <Check size={11} color="#059669" /> : <X size={11} color="#94a3b8" />}
      </div>
      {children}
    </div>
  );
}

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const success = tone === "success";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: success ? "#ecfdf5" : "#fff1f2", border: `1px solid ${success ? "#a7f3d0" : "#fecdd3"}`, color: success ? "#047857" : "#be123c", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 18 }}>
      {children}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 18,
  padding: "13px 16px",
  borderRadius: 10,
  border: 0,
  color: "white",
  fontSize: 14,
  fontWeight: 750,
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: 9,
  border: "1px solid #004aad",
  background: "white",
  color: "#004aad",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 7,
};
