import { CalendarDays, CreditCard, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { BoardLayout } from "../components/BoardLayout";
import { BrandMark } from "../components/BrandMark";
import { InstitutionalTrialBanner } from "../components/InstitutionalTrialBanner";
import { LangToggle } from "../components/LangToggle";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n";
import { schoolNavItems } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(value));
}

function SubscriptionDetails({ variant }: { variant: "school" | "board" }) {
  const { user } = useAuth();
  const sub = user?.subscription;

  const isTrial = Boolean(sub?.is_trial_active);
  const isActive = Boolean(sub?.is_active);
  const days = sub?.trial_days_remaining ?? 0;

  const statusLabel = isActive
    ? "Active subscription"
    : isTrial
      ? "Trial period"
      : "Access expired";

  const statusColor = isActive ? "#059669" : isTrial ? "#1d4ed8" : "#be123c";
  const statusBg = isActive ? "#ecfdf5" : isTrial ? "#eff6ff" : "#fff1f2";

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <CreditCard size={22} style={{ color: "#004aad" }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", margin: 0 }}>Subscription</h1>
      </div>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
        {variant === "school"
          ? "Your school account access is managed by Lecture Scientifique. There is no in-platform payment."
          : "Your school board account access is managed by Lecture Scientifique. There is no in-platform payment."}
      </p>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 6px" }}>Current status</p>
            <span
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                background: statusBg,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          {isTrial && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: days <= 7 ? "#92400e" : "#1e40af" }}>
              <CalendarDays size={18} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {days === 1 ? "1 day remaining" : `${days} days remaining`}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          {isTrial || sub?.access_mode === "trial" ? (
            <>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "0 0 4px" }}>Trial start</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0a1628", margin: 0 }}>
                  {formatDate(sub?.trial_started_at)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "0 0 4px" }}>Trial end</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0a1628", margin: 0 }}>
                  {formatDate(sub?.trial_ends_at)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "0 0 4px" }}>Subscription start</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0a1628", margin: 0 }}>
                  {formatDate(sub?.subscription_started_at)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "0 0 4px" }}>Subscription end</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0a1628", margin: 0 }}>
                  {!sub?.subscription_ends_at ? "No end date" : formatDate(sub.subscription_ends_at)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <ShieldCheck size={20} style={{ color: "#004aad", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", margin: "0 0 4px" }}>
            Need to renew or change access?
          </p>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            Contact Lecture Scientifique support. An administrator will update your trial or subscription dates.
          </p>
        </div>
      </div>
    </div>
  );
}

function SchoolSubscriptionLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleLogout = usePortalLogout();
  const navItems = schoolNavItems("subscription", t("nav.teacherRequests"));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#dff3ff" }}>
      <aside
        style={{
          width: 220,
          background: "#ffffff",
          borderRight: "1px solid #dff3ff",
          display: "flex",
          flexDirection: "column",
          padding: "28px 16px 20px",
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={32} />
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 10,
              background: "#dff3ff",
              color: "#004aad",
            }}
          >
            School Portal
          </span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: item.active ? "#dff3ff" : "transparent",
                color: item.active ? "#004aad" : "#374151",
                fontWeight: item.active ? 600 : 400,
                fontSize: 14,
              }}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div>
          <InstitutionalTrialBanner subscriptionPath="/school/subscription" compact />
          <LangToggle />
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "#ff5757",
              fontSize: 14,
              width: "100%",
            }}
          >
            <LogOut size={16} />
            {t("common.logout")}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>{children}</main>
    </div>
  );
}

export function SchoolSubscriptionPage() {
  return (
    <SchoolSubscriptionLayout>
      <SubscriptionDetails variant="school" />
    </SchoolSubscriptionLayout>
  );
}

export function BoardSubscriptionPage() {
  return (
    <BoardLayout activeNav="subscription">
      <SubscriptionDetails variant="board" />
    </BoardLayout>
  );
}
