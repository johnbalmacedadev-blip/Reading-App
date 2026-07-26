import { Ban } from "lucide-react";
import { TeacherLayout } from "../components/TeacherLayout";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";

export function AccountDeactivatedPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <TeacherLayout activeNav="profile" contentClassName="flex-1 p-10 overflow-y-auto">
      <div
        style={{
          maxWidth: 560,
          margin: "40px auto",
          background: "#ffffff",
          border: "1px solid #fecdd3",
          borderRadius: 18,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fff1f2",
            color: "#be123c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <Ban size={30} />
        </div>
        <p
          style={{
            display: "inline-block",
            margin: "0 0 14px",
            padding: "6px 12px",
            borderRadius: 999,
            background: "#fff1f2",
            color: "#be123c",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          {t("account.deactivated.badge")}
        </p>
        <h1 style={{ color: "#0f172a", fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>
          {t("account.deactivated.title")}
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6, margin: "0 0 18px" }}>
          {t("account.deactivated.body")}
        </p>
        {user?.email && (
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
            {user.email}
          </p>
        )}
      </div>
    </TeacherLayout>
  );
}
