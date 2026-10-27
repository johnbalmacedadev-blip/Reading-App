import { CalendarClock } from "lucide-react";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import {
  teacherShouldShowWalkthroughPromo,
  teacherWalkthroughUrl,
} from "../utils/teacherAccess";

export function TeacherWalkthroughPromo() {
  const { t } = useLanguage();
  const { user } = useAuth();

  if (!teacherShouldShowWalkthroughPromo(user)) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-6 mb-10 shadow-sm"
      style={{
        background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f0fdf4 100%)",
        border: "1px solid #bfdbfe",
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex-shrink-0 rounded-xl p-2.5"
            style={{ background: "#dff3ff", color: "#004aad" }}
          >
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#004aad" }}>
              {t("dashboard.walkthrough.needHelp")}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              {t("dashboard.walkthrough.body")}
            </p>
          </div>
        </div>
        <a
          href={teacherWalkthroughUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-95 flex-shrink-0"
          style={{ background: "#004aad", color: "#ffffff" }}
        >
          {t("dashboard.walkthrough.cta")}
        </a>
      </div>
    </div>
  );
}
