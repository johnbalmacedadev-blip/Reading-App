import { Bell, Loader2, RefreshCw } from "lucide-react";
import type { InstitutionalAccessMode, InstitutionalBillingNoticeType } from "../../api/client";

export type InstitutionalAccessForm = {
  access_mode: InstitutionalAccessMode;
  trial_started_at: string;
  trial_ends_at: string;
  subscription_started_at: string;
  subscription_ends_at: string;
  access?: string;
  is_trial_active?: boolean;
  trial_days_remaining?: number;
  activation_pending?: boolean;
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

const NOTICE_BUTTONS: { type: InstitutionalBillingNoticeType; label: string; tone: "blue" | "rose" | "emerald" | "amber" }[] = [
  { type: "trial_ending", label: "Trial ending soon", tone: "blue" },
  { type: "trial_expired", label: "Trial expired", tone: "rose" },
  { type: "subscription_started", label: "Subscription started", tone: "emerald" },
  { type: "subscription_renewed", label: "Subscription renewed", tone: "emerald" },
  { type: "subscription_cancelled", label: "Subscription cancelled", tone: "amber" },
  { type: "subscription_expired", label: "Subscription expired", tone: "rose" },
];

const toneStyle = {
  blue: { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8" },
  rose: { border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c" },
  emerald: { border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#047857" },
  amber: { border: "1px solid #fde68a", background: "#fffbeb", color: "#b45309" },
};

function defaultTrialEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyInstitutionalAccess(): InstitutionalAccessForm {
  return {
    access_mode: "trial",
    trial_started_at: today(),
    trial_ends_at: defaultTrialEnd(),
    subscription_started_at: today(),
    subscription_ends_at: "",
  };
}

export function InstitutionalAccessFields({
  form,
  isCreate,
  saving,
  noticeAction,
  onChange,
  onSendNotice,
  onExtendTrial,
  extendTrialAction,
  onResendActivation,
  onActivateAccount,
  activationAction,
}: {
  form: InstitutionalAccessForm;
  isCreate: boolean;
  saving: boolean;
  noticeAction: InstitutionalBillingNoticeType | null;
  onChange: (patch: Partial<InstitutionalAccessForm>) => void;
  onSendNotice?: (type: InstitutionalBillingNoticeType) => void;
  onExtendTrial?: () => void;
  extendTrialAction?: boolean;
  onResendActivation?: () => void;
  onActivateAccount?: () => void;
  activationAction?: "resend" | "activate" | null;
}) {
  const showExtendTrial = !isCreate && form.access === "Trial expired" && Boolean(onExtendTrial);

  return (
    <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: 0 }}>
          Access &amp; subscription
        </p>
        {!isCreate && form.access && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", background: "#e2e8f0", borderRadius: 999, padding: "3px 8px" }}>
            {form.access}
            {form.is_trial_active ? ` · ${form.trial_days_remaining ?? 0}d left` : ""}
          </span>
        )}
      </div>

      {!isCreate && form.activation_pending && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", margin: "0 0 6px" }}>
            Portal activation pending
          </p>
          <p style={{ fontSize: 11, color: "#9a3412", margin: "0 0 10px", lineHeight: 1.45 }}>
            This older account is still waiting for email activation. Resend the email, or activate now so they can sign in.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onResendActivation && (
              <button
                type="button"
                onClick={onResendActivation}
                disabled={saving || Boolean(activationAction)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 11px",
                  borderRadius: 7,
                  border: "1px solid #fdba74",
                  background: "#fff7ed",
                  color: "#c2410c",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {activationAction === "resend" ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                Resend activation email
              </button>
            )}
            {onActivateAccount && (
              <button
                type="button"
                onClick={onActivateAccount}
                disabled={saving || Boolean(activationAction)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 11px",
                  borderRadius: 7,
                  border: "none",
                  background: "#004aad",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {activationAction === "activate" ? <Loader2 size={13} className="animate-spin" /> : null}
                Activate account now
              </button>
            )}
          </div>
        </div>
      )}

      {showExtendTrial && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#047857", margin: "0 0 6px" }}>
            Trial expired — extend or reactivate
          </p>
          <p style={{ fontSize: 11, color: "#065f46", margin: "0 0 10px", lineHeight: 1.45 }}>
            Choose how many days to extend (max 30), then send. The email uses the portal user’s saved language.
          </p>
          <button
            type="button"
            onClick={onExtendTrial}
            disabled={saving || Boolean(extendTrialAction) || noticeAction !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 11px",
              borderRadius: 7,
              border: "1px solid #6ee7b7",
              background: "#d1fae5",
              color: "#047857",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {extendTrialAction ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Extend / reactivate trial
          </button>
        </div>
      )}

      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 12px", lineHeight: 1.45 }}>
        No in-platform payment. Choose trial or active subscription, then set the dates. Expired trial locks the portal.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {([
          { value: "trial" as const, label: "Trial period", hint: "Countdown until trial end" },
          { value: "subscription" as const, label: "Active subscription", hint: "Full access (optional end date)" },
        ]).map((opt) => {
          const selected = form.access_mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ access_mode: opt.value })}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                border: selected ? "2px solid #004aad" : "1px solid #e2e8f0",
                background: selected ? "#eff6ff" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0a1628" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{opt.hint}</div>
            </button>
          );
        })}
      </div>

      {form.access_mode === "trial" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
              Trial start
            </label>
            <input
              type="date"
              value={form.trial_started_at}
              onChange={(e) => onChange({ trial_started_at: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
              Trial end
            </label>
            <input
              type="date"
              value={form.trial_ends_at}
              onChange={(e) => onChange({ trial_ends_at: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
              Subscription start
            </label>
            <input
              type="date"
              value={form.subscription_started_at}
              onChange={(e) => onChange({ subscription_started_at: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
              Subscription end (optional)
            </label>
            <input
              type="date"
              value={form.subscription_ends_at}
              onChange={(e) => onChange({ subscription_ends_at: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {!isCreate && onSendNotice && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
            Manual email notifications
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NOTICE_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                type="button"
                onClick={() => onSendNotice(btn.type)}
                disabled={saving || noticeAction !== null || Boolean(extendTrialAction)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 11px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...toneStyle[btn.tone],
                }}
              >
                {noticeAction === btn.type ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
