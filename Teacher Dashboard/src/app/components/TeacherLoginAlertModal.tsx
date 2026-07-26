import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, CheckCircle2, Clock3, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n";
import { teacherIsAccountDeactivated, teacherIsInstitutional } from "../utils/teacherAccess";
import {
  clearTeacherLoginAlertPending,
  loginAlertPendingKey,
} from "../utils/teacherLoginAlert";

type AlertKind = "trial_ending" | "trial_expired" | "trial_active";

function resolveAlertKind(args: {
  isInstitutional: boolean;
  deactivated: boolean;
  isTrialActive: boolean;
  isActive: boolean;
  daysRemaining: number;
}): AlertKind | null {
  if (args.deactivated || args.isInstitutional || args.isActive) {
    return null;
  }

  if (!args.isTrialActive) {
    return "trial_expired";
  }

  if (args.daysRemaining <= 7) {
    return "trial_ending";
  }

  return "trial_active";
}

export function TeacherLoginAlertModal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tp } = useLanguage();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AlertKind | null>(null);

  const daysRemaining = user?.subscription?.trial_days_remaining ?? 0;
  const trialEndsAt = user?.subscription?.trial_ends_at
    ? new Date(user.subscription.trial_ends_at).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  useEffect(() => {
    if (!user || user.role !== "teacher") {
      setOpen(false);
      setKind(null);
      return;
    }

    let pending = false;
    try {
      pending = sessionStorage.getItem(loginAlertPendingKey(user.id)) === "1";
    } catch {
      pending = false;
    }

    if (!pending) {
      setOpen(false);
      setKind(null);
      return;
    }

    const nextKind = resolveAlertKind({
      isInstitutional: teacherIsInstitutional(user),
      deactivated: teacherIsAccountDeactivated(user),
      isTrialActive: Boolean(user.subscription?.is_trial_active),
      isActive: Boolean(user.subscription?.is_active),
      daysRemaining,
    });

    if (!nextKind) {
      clearTeacherLoginAlertPending(user.id);
      setOpen(false);
      setKind(null);
      return;
    }

    setKind(nextKind);
    setOpen(true);
  }, [user, daysRemaining]);

  const dismiss = () => {
    clearTeacherLoginAlertPending(user?.id);
    setOpen(false);
  };

  const goToPlans = () => {
    dismiss();
    navigate("/subscription");
  };

  if (!open || !kind) {
    return null;
  }

  const copy =
    kind === "trial_expired"
      ? {
          icon: <AlertCircle className="w-7 h-7" />,
          iconBg: "#fff1f2",
          iconColor: "#be123c",
          title: t("loginAlert.expired.title"),
          body: tp("loginAlert.expired.body", { date: trialEndsAt || "—" }),
          cta: t("loginAlert.expired.cta"),
          secondary: t("loginAlert.dismiss"),
        }
      : kind === "trial_ending"
        ? {
            icon: <Clock3 className="w-7 h-7" />,
            iconBg: "#fffbeb",
            iconColor: "#b45309",
            title: t("loginAlert.ending.title"),
            body: tp("loginAlert.ending.body", {
              days: daysRemaining,
              date: trialEndsAt || "—",
            }),
            cta: t("loginAlert.ending.cta"),
            secondary: t("loginAlert.dismiss"),
          }
        : {
            icon: <CheckCircle2 className="w-7 h-7" />,
            iconBg: "#eff6ff",
            iconColor: "#004aad",
            title: t("loginAlert.active.title"),
            body: tp("loginAlert.active.body", {
              days: daysRemaining,
              date: trialEndsAt || "—",
            }),
            cta: t("loginAlert.active.cta"),
            secondary: t("loginAlert.dismiss"),
          };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-login-alert-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-xl relative"
        style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
          aria-label={t("common.cancel")}
        >
          <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
        </button>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: copy.iconBg, color: copy.iconColor }}
        >
          {copy.icon}
        </div>

        <h3
          id="teacher-login-alert-title"
          className="text-2xl font-bold mb-3"
          style={{ color: "#004aad" }}
        >
          {copy.title}
        </h3>
        <p className="text-base leading-relaxed mb-7" style={{ color: "#475569" }}>
          {copy.body}
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={goToPlans}
            className="w-full py-3.5 rounded-xl font-semibold transition-all"
            style={{ background: "#004aad", color: "#ffffff" }}
          >
            {copy.cta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 rounded-xl font-medium transition-all"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#475569" }}
          >
            {copy.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
