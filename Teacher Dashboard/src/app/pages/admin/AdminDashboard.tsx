import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Building2, School, Users, GraduationCap, TrendingUp,
  AlertCircle, CheckCircle2, Clock, UserPlus, BookOpen, Edit3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const kpis = [
  { label: "School Boards", value: 4, icon: Building2, color: "#004aad", bg: "#dff3ff", delta: "+1 this month" },
  { label: "Schools", value: 18, icon: School, color: "#38b6ff", bg: "#e6f7ff", delta: "+2 this month" },
  { label: "Teachers", value: 142, icon: Users, color: "#7c3aed", bg: "#f3f0ff", delta: "+8 this month" },
  { label: "Student Records", value: 3247, icon: GraduationCap, color: "#059669", bg: "#ecfdf5", delta: "+94 this month" },
];

const recentActivity = [
  { id: 1, type: "create", user: "Admin Marie Côté", action: "Created school", target: "École Saint-Laurent", time: "12 min ago", icon: School, color: "#004aad" },
  { id: 2, type: "edit", user: "Admin Pierre Gagnon", action: "Modified teacher", target: "Mr. Jean Tremblay", time: "34 min ago", icon: Edit3, color: "#38b6ff" },
  { id: 3, type: "create", user: "Admin Marie Côté", action: "Added user", target: "Mrs. Sophie Lavoie", time: "1h ago", icon: UserPlus, color: "#7c3aed" },
  { id: 4, type: "upload", user: "Admin Luc Bergeron", action: "Uploaded content", target: "Atelier 7 — Sheet A", time: "2h ago", icon: BookOpen, color: "#059669" },
  { id: 5, type: "create", user: "Admin Pierre Gagnon", action: "Created assessment", target: "Unit 3 — Final MCQ", time: "3h ago", icon: CheckCircle2, color: "#d97706" },
  { id: 6, type: "archive", user: "Admin Marie Côté", action: "Archived school", target: "École Bellevue (old)", time: "Yesterday, 4:45 PM", icon: AlertCircle, color: "#ff5757" },
  { id: 7, type: "edit", user: "Admin Luc Bergeron", action: "Updated settings", target: "CSDM Board", time: "Yesterday, 2:20 PM", icon: Edit3, color: "#38b6ff" },
];

const adoptionData = [
  { name: "CSDM", actifs: 94, total: 100 },
  { name: "CSDN", actifs: 78, total: 85 },
  { name: "CSMB", actifs: 61, total: 70 },
  { name: "CSPO", actifs: 49, total: 55 },
];

const growthData = [
  { month: "Sep", eleves: 2810 },
  { month: "Oct", eleves: 2944 },
  { month: "Nov", eleves: 3012 },
  { month: "Dec", eleves: 3065 },
  { month: "Jan", eleves: 3110 },
  { month: "Feb", eleves: 3180 },
  { month: "Mar", eleves: 3247 },
];

const systemAlerts = [
  { type: "warning", msg: "5 teachers haven't accessed the platform in 30+ days", icon: Clock },
  { type: "info", msg: "Platform update scheduled: June 22, 2026, 2am–4am", icon: AlertCircle },
  { type: "success", msg: "Data synchronization completed successfully (June 18, 2026)", icon: CheckCircle2 },
];

export function AdminDashboard() {
  const [_period, setPeriod] = useState("2025-2026");

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px", maxWidth: 1400 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0a1628", margin: 0 }}>Dashboard</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Platform overview — School year 2025–2026</p>
          </div>
          <select
            value={_period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: "white", fontSize: 13, color: "#374151", cursor: "pointer",
              outline: "none",
            }}
          >
            <option>2025-2026</option>
            <option>2024-2025</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "white", borderRadius: 14, padding: "20px 22px",
              border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ background: k.bg, borderRadius: 10, padding: 9 }}>
                  <k.icon size={18} color={k.color} />
                </div>
                <span style={{ fontSize: 11, color: "#059669", fontWeight: 500, background: "#ecfdf5", borderRadius: 12, padding: "2px 8px" }}>
                  {k.delta}
                </span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#0a1628", lineHeight: 1 }}>{k.value.toLocaleString("en-US")}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Adoption chart */}
          <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: "0 0 18px" }}>Adoption by School Board</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={adoptionData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number, n: string) => [v, n === "actifs" ? "Active teachers" : "Total"]}
                />
                <Bar dataKey="total" fill="#dff3ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actifs" fill="#004aad" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Growth chart */}
          <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: 0 }}>Student Records Growth</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingUp size={14} color="#059669" />
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>+15.5% this year</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[2700, 3400]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="eleves" stroke="#38b6ff" strokeWidth={2.5} dot={{ fill: "#38b6ff", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
          {/* Recent activity */}
          <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: 0 }}>Recent Activity</h3>
              <button style={{ fontSize: 12, color: "#38b6ff", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                View all →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {recentActivity.map((a, i) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid #f8fafc" : "none",
                }}>
                  <div style={{ background: `${a.color}15`, borderRadius: 8, padding: 7, flexShrink: 0, marginTop: 1 }}>
                    <a.icon size={14} color={a.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 500 }}>{a.user}</span>
                      <span style={{ color: "#64748b" }}> — {a.action} </span>
                      <span style={{ fontWeight: 500 }}>{a.target}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System alerts */}
          <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: "0 0 18px" }}>System Alerts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {systemAlerts.map((a, i) => {
                const colors = { warning: "#d97706", info: "#004aad", success: "#059669" };
                const bgs = { warning: "#fffbeb", info: "#eff6ff", success: "#ecfdf5" };
                const color = colors[a.type as keyof typeof colors];
                const bg = bgs[a.type as keyof typeof bgs];
                return (
                  <div key={i} style={{ background: bg, borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <a.icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{a.msg}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628", marginBottom: 10 }}>Platform Health</div>
              {[
                { label: "API Availability", value: "99.9%", ok: true },
                { label: "Avg Response Time", value: "142ms", ok: true },
                { label: "Storage Used", value: "38%", ok: true },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? "#059669" : "#ff5757" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
