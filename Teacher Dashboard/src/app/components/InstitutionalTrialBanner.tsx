import { CalendarDays } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function InstitutionalTrialBanner({
  subscriptionPath,
  compact = false,
}: {
  subscriptionPath: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user || (user.role !== "school_admin" && user.role !== "board_admin")) {
    return null;
  }

  if (user.subscription?.is_active) {
    return null;
  }

  if (!user.subscription?.is_trial_active) {
    return null;
  }

  const days = user.subscription.trial_days_remaining ?? 0;
  const urgent = days <= 7;

  return (
    <button
      type="button"
      onClick={() => navigate(subscriptionPath)}
      className="w-full text-left transition-opacity hover:opacity-95"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        padding: compact ? "8px 10px" : "12px 14px",
        borderRadius: 12,
        border: `1px solid ${urgent ? "#fde68a" : "#bfdbfe"}`,
        background: urgent ? "#fffbeb" : "#eff6ff",
        color: urgent ? "#92400e" : "#1e40af",
        cursor: "pointer",
        marginBottom: compact ? 8 : 12,
      }}
    >
      <CalendarDays size={compact ? 16 : 18} className="shrink-0" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, lineHeight: 1.3 }}>
          {days === 1 ? "1 day left in your trial" : `${days} days left in your trial`}
        </div>
        {!compact && (
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            View subscription details
          </div>
        )}
      </div>
    </button>
  );
}
