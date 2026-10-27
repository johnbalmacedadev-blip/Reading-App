import { AlertTriangle, LogOut } from "lucide-react";
import { usePortalLogout } from "../hooks/usePortalLogout";

export function InstitutionalExpiredLock({
  portalLabel = "portal",
}: {
  portalLabel?: string;
}) {
  const handleLogout = usePortalLogout();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 22, 40, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="institutional-expired-title"
        style={{
          width: "100%",
          maxWidth: 440,
          background: "white",
          borderRadius: 16,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#fff1f2",
            color: "#be123c",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={28} />
        </div>
        <h2
          id="institutional-expired-title"
          style={{ fontSize: 20, fontWeight: 800, color: "#0a1628", margin: "0 0 10px" }}
        >
          Account access expired
        </h2>
        <p style={{ fontSize: 14, color: "#475569", margin: "0 0 22px", lineHeight: 1.55 }}>
          Your {portalLabel} trial or subscription has ended. All pages are locked until Lecture Scientifique renews access.
          Please contact your administrator or support to restore the account.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: 10,
            border: "none",
            background: "#004aad",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
