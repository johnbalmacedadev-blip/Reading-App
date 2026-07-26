import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n";
import { teacherCanAccessAssessments, teacherHomePath, teacherIsAccountDeactivated } from "../utils/teacherAccess";

export function TeacherRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (teacherIsAccountDeactivated(user) && location.pathname !== "/account-status") {
    return <Navigate to="/account-status" replace />;
  }

  if (
    !teacherIsAccountDeactivated(user)
    && location.pathname !== "/subscription"
    && user.subscription
    && !user.subscription.is_trial_active
    && !user.subscription.is_active
  ) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}

/** Assessments management is only for independent teachers (no school / board). */
export function IndependentTeacherAssessmentsRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return <Navigate to="/signin" replace />;
  }

  if (teacherIsAccountDeactivated(user)) {
    return <Navigate to="/account-status" replace />;
  }

  if (!teacherCanAccessAssessments(user)) {
    return <Navigate to={teacherHomePath(user)} replace />;
  }

  return <>{children}</>;
}

export function ClassroomAccessRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return <Navigate to="/signin" replace />;
  }

  if (teacherIsAccountDeactivated(user)) {
    return <Navigate to="/account-status" replace />;
  }

  if (!user.subscription?.can_access_classroom) {
    return <Navigate to="/library" replace />;
  }

  return <>{children}</>;
}

export function ActiveSubscriptionReportsRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return <Navigate to="/signin" replace />;
  }

  if (teacherIsAccountDeactivated(user)) {
    return <Navigate to="/account-status" replace />;
  }

  if (!user.subscription?.can_access_reports) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}
