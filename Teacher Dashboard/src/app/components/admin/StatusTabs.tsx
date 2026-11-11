export type StatusTab = "Active" | "Archived";

/** Active / Archived tab switcher used by the admin Schools and School Boards lists. */
export function StatusTabs({
  value,
  onChange,
  counts,
}: {
  value: StatusTab;
  onChange: (tab: StatusTab) => void;
  counts: Record<StatusTab, number>;
}) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
      {(["Active", "Archived"] as const).map((tab) => {
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            style={{
              padding: "9px 14px",
              border: "none",
              borderBottom: active ? "2px solid #004aad" : "2px solid transparent",
              marginBottom: -1,
              background: "none",
              color: active ? "#004aad" : "#64748b",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {tab}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 10,
                background: active ? "#dff3ff" : "#f1f5f9",
                color: active ? "#004aad" : "#64748b",
              }}
            >
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
