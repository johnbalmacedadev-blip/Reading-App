import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Search, Download, Filter, UserPlus, Edit2, Trash2, Archive, LogIn, Settings, Upload, Shield, ChevronDown } from "lucide-react";

type AuditEntry = {
  id: number; timestamp: string; user: string; role: string;
  action: string; category: string; target: string; ip: string; severity: "info" | "warning" | "critical";
};

const actionIcons: Record<string, typeof Search> = {
  "Create": UserPlus, "Edit": Edit2, "Delete": Trash2,
  "Archive": Archive, "Login": LogIn, "Configuration": Settings,
  "Upload": Upload, "Permission": Shield,
};

const severityConfig = {
  "info": { bg: "#f0f9ff", color: "#0369a1", label: "Info" },
  "warning": { bg: "#fffbeb", color: "#d97706", label: "Warning" },
  "critical": { bg: "#fff1f2", color: "#e11d48", label: "Critical" },
};

const auditData: AuditEntry[] = [
  { id: 1, timestamp: "2026-06-18 14:32:05", user: "Admin Marie Côté", role: "Administrator", action: "Create", category: "School", target: "École Saint-Laurent created", ip: "192.168.1.10", severity: "info" },
  { id: 2, timestamp: "2026-06-18 14:15:22", user: "Admin Pierre Gagnon", role: "Administrator", action: "Edit", category: "Teacher", target: "Mr. Jean Tremblay — school modified", ip: "192.168.1.11", severity: "info" },
  { id: 3, timestamp: "2026-06-18 13:48:10", user: "Admin Marie Côté", role: "Administrator", action: "Login", category: "Authentication", target: "Successful login — admin portal", ip: "192.168.1.10", severity: "info" },
  { id: 4, timestamp: "2026-06-18 11:22:33", user: "Admin Luc Bergeron", role: "Administrator", action: "Upload", category: "Content", target: "Atelier 7 — Sheet A.pdf uploaded", ip: "192.168.1.15", severity: "info" },
  { id: 5, timestamp: "2026-06-18 10:05:44", user: "Admin Pierre Gagnon", role: "Administrator", action: "Create", category: "Assessment", target: "Unit 3 — Final MCQ created", ip: "192.168.1.11", severity: "info" },
  { id: 6, timestamp: "2026-06-17 16:44:12", user: "Admin Marie Côté", role: "Administrator", action: "Archive", category: "School", target: "École Bellevue archived", ip: "192.168.1.10", severity: "warning" },
  { id: 7, timestamp: "2026-06-17 14:19:55", user: "Admin Luc Bergeron", role: "Administrator", action: "Configuration", category: "Settings", target: "Default language changed → French", ip: "192.168.1.15", severity: "warning" },
  { id: 8, timestamp: "2026-06-17 11:33:07", user: "Unknown", role: "—", action: "Login", category: "Authentication", target: "Failed login attempt × 3", ip: "203.0.113.45", severity: "critical" },
  { id: 9, timestamp: "2026-06-16 15:22:40", user: "Admin Marie Côté", role: "Administrator", action: "Permission", category: "Access", target: "CSDN board access granted to P. Gagnon", ip: "192.168.1.10", severity: "warning" },
  { id: 10, timestamp: "2026-06-16 09:10:18", user: "Admin Pierre Gagnon", role: "Administrator", action: "Delete", category: "Content", target: "Old Atelier 1 sheet deleted", ip: "192.168.1.11", severity: "warning" },
  { id: 11, timestamp: "2026-06-15 16:55:30", user: "Admin Luc Bergeron", role: "Administrator", action: "Edit", category: "Board", target: "CSPO — contact details updated", ip: "192.168.1.15", severity: "info" },
  { id: 12, timestamp: "2026-06-15 14:00:00", user: "System", role: "Automatic", action: "Configuration", category: "Maintenance", target: "Automatic backup completed", ip: "127.0.0.1", severity: "info" },
];

const categories = ["All", "School", "Teacher", "Board", "Content", "Assessment", "Authentication", "Settings", "Access", "Maintenance"];

export function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [dateRange, setDateRange] = useState("Last 7 days");

  const filtered = auditData.filter((e) => {
    const matchSearch = e.target.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || e.category === category;
    const matchSeverity = severity === "All" || e.severity === severity.toLowerCase();
    return matchSearch && matchCategory && matchSeverity;
  });

  const counts = {
    total: auditData.length,
    critical: auditData.filter(e => e.severity === "critical").length,
    warning: auditData.filter(e => e.severity === "warning").length,
    info: auditData.filter(e => e.severity === "info").length,
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Audit Log</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>System activity and change history</p>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#374151" }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Entries", value: counts.total, color: "#004aad", bg: "#dff3ff" },
            { label: "Critical", value: counts.critical, color: "#e11d48", bg: "#fff1f2" },
            { label: "Warning", value: counts.warning, color: "#d97706", bg: "#fffbeb" },
            { label: "Informational", value: counts.info, color: "#059669", bg: "#ecfdf5" },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
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

        {/* Table */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Timestamp", "User", "Action", "Category", "Detail", "IP Address", "Severity"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
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
          {filtered.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No matching entry.</div>}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} entr{filtered.length !== 1 ? "ies" : "y"} displayed</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Showing last 7 days — 12 month retention</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
