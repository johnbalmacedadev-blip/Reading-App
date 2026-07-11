import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Search, Download, Filter, UserPlus, Edit2, Trash2, Archive, LogIn, Settings, Upload, Shield, ChevronDown, Loader2, FileDown } from "lucide-react";
import { auditApi, type AuditLogEntry } from "../../api/client";

const actionIcons: Record<string, typeof Search> = {
  "Create": UserPlus, "Edit": Edit2, "Delete": Trash2,
  "Archive": Archive, "Login": LogIn, "Configuration": Settings,
  "Upload": Upload, "Permission": Shield, "Export": FileDown, "Activate": Filter,
};

const severityConfig = {
  "info": { bg: "#f0f9ff", color: "#0369a1", label: "Info" },
  "warning": { bg: "#fffbeb", color: "#d97706", label: "Warning" },
  "critical": { bg: "#fff1f2", color: "#e11d48", label: "Critical" },
};

const categories = ["All", "School", "Teacher", "Board", "Content", "Assessment", "Authentication", "Settings", "Access", "Maintenance", "Student"];

export function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [dateRange, setDateRange] = useState("Last 7 days");
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await auditApi.list({
        search: search || undefined,
        category,
        severity,
        date_range: dateRange,
      });
      setEntries(result.entries);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log.");
      setEntries([]);
      setSummary({ total: 0, critical: 0, warning: 0, info: 0 });
    } finally {
      setLoading(false);
    }
  }, [search, category, severity, dateRange]);

  useEffect(() => {
    const timer = setTimeout(loadAudit, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadAudit, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = auditApi.exportUrl({
        search: search || undefined,
        category,
        severity,
        date_range: dateRange,
      });
      const response = await fetch(url, {
        credentials: "include",
        headers: { Accept: "text/csv", "X-Requested-With": "XMLHttpRequest" },
      });
      if (!response.ok) {
        throw new Error("Export failed.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      await loadAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Audit Log</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>System activity and change history</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 500, cursor: exporting ? "wait" : "pointer", color: "#374151" }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Entries", value: loading ? "—" : summary.total, color: "#004aad", bg: "#dff3ff" },
            { label: "Critical", value: loading ? "—" : summary.critical, color: "#e11d48", bg: "#fff1f2" },
            { label: "Warning", value: loading ? "—" : summary.warning, color: "#d97706", bg: "#fffbeb" },
            { label: "Informational", value: loading ? "—" : summary.info, color: "#059669", bg: "#ecfdf5" },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button type="button" onClick={loadAudit} style={{ marginLeft: 12, background: "none", border: "none", color: "#be123c", cursor: "pointer", textDecoration: "underline" }}>
              Retry
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in logs..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          {[
            { value: category, onChange: setCategory, options: categories },
            { value: severity, onChange: setSeverity, options: ["All", "Critical", "Warning", "Info"] },
            { value: dateRange, onChange: setDateRange, options: ["Today", "Last 7 days", "Last 30 days", "This year"] },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
                {sel.options.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 48, color: "#64748b" }}>
              <Loader2 size={20} className="animate-spin" /> Loading audit log...
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Timestamp", "User", "Action", "Category", "Detail", "IP Address", "Severity"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const sc = severityConfig[e.severity];
                  const IconComp = actionIcons[e.action] || Filter;
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid #f1f5f9", background: e.severity === "critical" ? "#fff8f8" : i % 2 === 0 ? "white" : "#fafbfc" }}>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap", fontFamily: "monospace" }}>{e.timestamp}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{e.user}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{e.role}</div>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ background: "#f1f5f9", borderRadius: 6, padding: 5 }}>
                            <IconComp size={12} color="#64748b" />
                          </div>
                          <span style={{ fontSize: 12, color: "#374151" }}>{e.action}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#f1f5f9", color: "#64748b" }}>{e.category}</span>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#374151", maxWidth: 280 }}>{e.target}</td>
                      <td style={{ padding: "11px 16px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{e.ip}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && entries.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No matching entry.</div>}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{entries.length} entr{entries.length !== 1 ? "ies" : "y"} displayed</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{dateRange} — 12 month retention</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
