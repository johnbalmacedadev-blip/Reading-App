import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n";

export function BoardRoute({ children }: { children: React.ReactNode }) {
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

  if (!user || user.role !== "board_admin") {
    return <Navigate to="/" replace state={{ portal: "conseil", from: location.pathname }} />;
  }

  return <>{children}</>;
}
