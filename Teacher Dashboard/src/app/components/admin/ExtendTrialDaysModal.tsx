import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

const MAX_DAYS = 30;

export function ExtendTrialDaysModal({
  open,
  subjectName,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  subjectName?: string;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
}) {
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (open) setDays(7);
  }, [open]);

  if (!open) return null;

  const clamped = Math.max(1, Math.min(MAX_DAYS, Number.isFinite(days) ? days : 7));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a1628" }}>
              Extend / reactivate trial
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {subjectName ? `${subjectName} — ` : ""}
              Choose how many days to add (1–{MAX_DAYS}). An email is sent in the user’s saved language.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 4,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Extension length (days)
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={MAX_DAYS}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={submitting}
              style={{
                width: 100,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                outline: "none",
              }}
            />
            <select
              value={clamped}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                background: "white",
              }}
            >
              {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} day{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
            Maximum {MAX_DAYS} days. The trial email uses the recipient’s preferred language (EN/FR).
          </p>
        </div>

        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(clamped)}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: "#047857",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Send extension
          </button>
        </div>
      </div>
    </div>
  );
}
