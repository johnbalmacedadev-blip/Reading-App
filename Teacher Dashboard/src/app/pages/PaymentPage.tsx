import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, ArrowLeft, Lock, CreditCard, Check, Shield,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

function CardInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 8,
  border: "1px solid #e2e8f0", background: "white",
  fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  color: "#1e293b", transition: "border-color 0.15s",
};

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

export function PaymentPage() {
  const navigate = useNavigate();
  const { t, tp, lang } = useLanguage();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [form, setForm] = useState({ name: "", card: "", expiry: "", cvc: "", email: "", country: "canada" });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const prices = useMemo(
    () => ({
      monthly: lang === "fr" ? "19,00 $" : "$19.00",
      annual: lang === "fr" ? "16,00 $" : "$16.00",
      zero: lang === "fr" ? "0,00 $" : "$0.00",
      discount: lang === "fr" ? "−19,00 $" : "−$19.00",
      tax: lang === "fr" ? "0,00 $" : "$0.00",
    }),
    [lang]
  );

  const price = billing === "monthly" ? prices.monthly : prices.annual;
  const period = billing === "monthly" ? t("payment.periodMonthly") : t("payment.periodAnnual");
  const billingDate = t("payment.billingDate");

  const countries = useMemo(
    () => [
      { value: "canada", label: t("payment.country.canada") },
      { value: "us", label: t("payment.country.us") },
      { value: "france", label: t("payment.country.france") },
      { value: "belgium", label: t("payment.country.belgium") },
    ],
    [t]
  );

  const summaryFeatures = useMemo(
    () => [t("payment.fullAccess14"), t("payment.cancelOneClick"), t("plan.included4")],
    [t]
  );

  const trustBadges = useMemo(
    () => [
      { icon: Shield, text: "SSL 256-bit" },
      { icon: Lock, text: t("payment.stripeSecure") },
      { icon: Check, text: t("payment.cancelAnytime") },
    ],
    [t]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setDone(true); }, 2000);
  };

  if (done) {
    const successRows = [
      [t("payment.success.planLabel"), t("plan.essentials.name")],
      [t("payment.success.trialLabel"), t("payment.success.trialDays")],
      [
        t("payment.success.firstPaymentLabel"),
        billing === "monthly"
          ? t("payment.success.firstPaymentMonthly")
          : t("payment.success.firstPaymentAnnual"),
      ],
    ];

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <LangToggle className="" />
        </div>
        <div style={{ background: "white", borderRadius: 20, padding: "48px 52px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,74,173,0.1)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Check size={32} color="#059669" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <BookOpen size={20} color="#004aad" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#004aad" }}>{t("common.appName")}</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>{t("payment.success.welcome")}</h2>
          <p style={{ fontSize: 15, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
            {tp("payment.success.body", { date: billingDate })}
          </p>
          <div style={{ background: "#dff3ff", borderRadius: 12, padding: "14px 18px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#004aad", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("payment.success.summary")}</div>
            {successRows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/dashboard")}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#004aad", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            {t("payment.success.goToDashboard")}
          </button>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>{t("payment.success.confirmEmail")}</p>
        </div>
      </div>
    );
  }

  const lineItems = [
    {
      label: billing === "monthly" ? t("payment.planLineMonthly") : t("payment.planLineAnnual"),
      value: price,
      discount: false,
    },
    { label: t("payment.freeTrial14"), value: prices.discount, discount: true },
    { label: t("payment.taxes"), value: prices.tax, discount: false },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen size={22} color="#004aad" />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#004aad" }}>{t("common.appName")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
            <Lock size={13} />
            {t("payment.secureHeader")}
          </div>
          <LangToggle className="" />
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 420px", gap: 0, maxWidth: 1000, margin: "0 auto", width: "100%", padding: "40px 24px", alignItems: "start" }}>
        <div style={{ paddingRight: 40 }}>
          <button onClick={() => navigate("/signup/plan")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 28 }}>
            <ArrowLeft size={14} /> {t("payment.backToPlans")}
          </button>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>{t("payment.title")}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>{t("payment.subtitle")}</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <CardInput label={t("signup.email")}>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email" placeholder={t("signup.emailPlaceholder")} style={inputStyle} required />
            </CardInput>

            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: 0.4 }}>{t("payment.cardInfo")}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  {["visa", "mc", "amex"].map((c) => (
                    <div key={c} style={{ width: 36, height: 22, borderRadius: 4, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>{t("payment.cardNumber")}</label>
                  <div style={{ position: "relative" }}>
                    <CreditCard size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={form.card} onChange={(e) => setForm({ ...form, card: formatCard(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      style={{ ...inputStyle, paddingLeft: 36, border: "1px solid #f1f5f9", background: "#fafbfc" }} required />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>{t("payment.expiry")}</label>
                    <input value={form.expiry} onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
                      placeholder={t("payment.expiryPlaceholder")}
                      style={{ ...inputStyle, border: "1px solid #f1f5f9", background: "#fafbfc" }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>{t("payment.cvc")}</label>
                    <input value={form.cvc} onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="123"
                      style={{ ...inputStyle, border: "1px solid #f1f5f9", background: "#fafbfc" }} required />
                  </div>
                </div>
              </div>
            </div>

            <CardInput label={t("payment.nameOnCard")}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("payment.namePlaceholder")} style={inputStyle} required />
            </CardInput>

            <CardInput label={t("payment.country")}>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                style={{ ...inputStyle }}>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </CardInput>

            <button type="submit" disabled={processing}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: processing ? "#94a3b8" : "#004aad",
                color: "white", fontSize: 15, fontWeight: 700, cursor: processing ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s",
              }}>
              <Lock size={15} />
              {processing ? t("payment.processing") : t("payment.activateTrial")}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              {trustBadges.map((s) => (
                <div key={s.text} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                  <s.icon size={11} />
                  {s.text}
                </div>
              ))}
            </div>
          </form>
        </div>

        <div style={{ background: "white", borderRadius: 18, border: "1px solid #f1f5f9", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "sticky", top: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>{t("payment.orderSummary")}</h3>

          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "#dff3ff", borderRadius: 12, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#004aad", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#004aad" }}>{t("payment.planEssentials")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t("common.appName")}</div>
            </div>
          </div>

          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 18 }}>
            {(["monthly", "annual"] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)}
                style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", background: billing === b ? "white" : "transparent", color: billing === b ? "#1e293b" : "#94a3b8", boxShadow: billing === b ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                {b === "monthly" ? t("plan.monthly") : t("plan.annual")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {lineItems.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>{row.label}</span>
                <span style={{ fontWeight: row.discount ? 600 : 400, color: row.discount ? "#059669" : "#1e293b" }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{t("payment.dueToday")}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#004aad" }}>{prices.zero}</span>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 16 }}>
            {tp("payment.billingNote", { price, period, date: billingDate })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summaryFeatures.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#374151" }}>
                <Check size={13} color="#059669" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
