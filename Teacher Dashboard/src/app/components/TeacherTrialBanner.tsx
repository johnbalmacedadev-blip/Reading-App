import { BadgeCheck, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { teacherIsAccountDeactivated, teacherIsInstitutional } from "../utils/teacherAccess";

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - startOfToday.getTime()) / 86400000));
}

export function TeacherTrialBanner({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { t, tp } = useLanguage();
  const { user } = useAuth();

  if (!user || user.role !== "teacher" || teacherIsAccountDeactivated(user)) {
    return null;
  }

  const institutional = teacherIsInstitutional(user);

  if (user.subscription?.is_active) {
    const plan = user.subscription.plan === "insights" ? t("plan.insights") : t("plan.essentials");
    const renewalDays = daysUntil(user.subscription.subscription_ends_at);

    return (
      <button
        type="button"
        disabled={institutional}
        onClick={() => {
          if (!institutional) navigate("/subscription");
        }}
        className="w-full text-left transition-opacity hover:opacity-95"
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 8 : 12,
          padding: compact ? "8px 10px" : "12px 14px",
          borderRadius: 12,
          border: "1px solid #a7f3d0",
          background: "#ecfdf5",
          color: "#047857",
          cursor: institutional ? "default" : "pointer",
        }}
      >
        <BadgeCheck size={compact ? 16 : 18} className="shrink-0" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, lineHeight: 1.3 }}>
            {tp("plan.banner.title", { plan })}
          </div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            {renewalDays > 0
              ? tp("plan.banner.renews", { days: renewalDays })
              : institutional
                ? ""
                : t("plan.banner.hint")}
          </div>
        </div>
      </button>
    );
  }

  if (institutional) {
    return null;
  }

  const trialActive = Boolean(user.subscription?.is_trial_active);
  const days = user.subscription?.trial_days_remaining ?? 0;
  const urgent = trialActive && days <= 7;

  if (!trialActive && !user.subscription) {
    return null;
  }

  // Show for active trial, or expired trial (still trialing in DB / no paid plan)
  const expired = !trialActive;

  return (
    <button
      type="button"
      onClick={() => navigate("/subscription")}
      className="w-full text-left transition-opacity hover:opacity-95"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        padding: compact ? "8px 10px" : "12px 14px",
        borderRadius: 12,
        border: `1px solid ${expired ? "#fecdd3" : urgent ? "#fde68a" : "#bfdbfe"}`,
        background: expired ? "#fff1f2" : urgent ? "#fffbeb" : "#eff6ff",
        color: expired ? "#be123c" : urgent ? "#92400e" : "#1e40af",
        cursor: "pointer",
      }}
    >
      <CalendarDays size={compact ? 16 : 18} className="shrink-0" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, lineHeight: 1.3 }}>
          {expired
            ? t("trial.banner.expiredTitle")
            : tp("trial.banner.daysLeft", { days })}
        </div>
        {!compact && (
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            {expired ? t("trial.banner.expiredHint") : t("trial.banner.activeHint")}
          </div>
        )}
      </div>
    </button>
  );
}
