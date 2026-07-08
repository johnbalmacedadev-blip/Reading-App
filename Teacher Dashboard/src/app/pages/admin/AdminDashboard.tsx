import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  Building2, School, Users, GraduationCap, TrendingUp,
  AlertCircle, CheckCircle2, Clock, UserPlus, BookOpen, Edit3, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { adminDashboardApi, type AdminDashboardData } from "../../api/client";

const kpiConfig = [
  { key: "school_boards" as const, label: "School Boards", icon: Building2, color: "#004aad", bg: "#dff3ff" },
  { key: "schools" as const, label: "Schools", icon: School, color: "#38b6ff", bg: "#e6f7ff" },
  { key: "teachers" as const, label: "Teachers", icon: Users, color: "#7c3aed", bg: "#f3f0ff" },
  { key: "students" as const, label: "Student Records", icon: GraduationCap, color: "#059669", bg: "#ecfdf5" },
];

const activityIcons: Record<string, typeof School> = {
  school: School,
  board: Building2,
  teacher: UserPlus,
  student: GraduationCap,
  content: BookOpen,
  create: UserPlus,
  edit: Edit3,
  archive: AlertCircle,
  upload: BookOpen,
};

const activityColors: Record<string, string> = {
  school: "#004aad",
  board: "#004aad",
  teacher: "#7c3aed",
  student: "#059669",
  content: "#059669",
  create: "#004aad",
  edit: "#38b6ff",
  archive: "#ff5757",
  upload: "#059669",
};

const alertIcons = {
  warning: Clock,
  info: AlertCircle,
  success: CheckCircle2,
};

function formatDelta(delta: number, label: string): string {
  if (delta <= 0) return "No change this month";
  return `+${delta} this month`;
}

function schoolYearOptions(): string[] {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${startYear}-${startYear + 1}`, `${startYear - 1}-${startYear}`];
}

export function AdminDashboard() {
  const [schoolYear, setSchoolYear] = useState(schoolYearOptions()[0]);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminDashboardApi.get(schoolYear);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const adoptionData = useMemo(
    () =>
      (data?.adoption_by_board ?? []).map((b) => ({
        name: b.code,
        actifs: b.active_teachers,
        total: b.total_teachers,
      })),
    [data]
  );

  const growthData = useMemo(
    () =>
      (data?.student_growth ?? []).map((point) => ({
        month: point.month,
        eleves: point.students,
      })),
    [data]
  );

  const growthDomain = useMemo(() => {
    if (growthData.length === 0) return [0, 100];
    const values = growthData.map((d) => d.eleves);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(10, Math.round((max - min) * 0.1));
    return [Math.max(0, min - padding), max + padding];
  }, [growthData]);

  const yearOptions = schoolYearOptions();

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px", maxWidth: 1400 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0a1628", margin: 0 }}>Dashboard</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              Platform overview — School year {schoolYear.replace("-", "–")}
            </p>
          </div>
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: "white", fontSize: 13, color: "#374151", cursor: "pointer",
              outline: "none",
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={loadDashboard} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80, color: "#64748b", gap: 8, alignItems: "center" }}>
            <Loader2 size={20} className="animate-spin" /> Loading dashboard…
          </div>
        ) : data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
              {kpiConfig.map((k) => {
                const stat = data.kpis[k.key];
                const Icon = k.icon;
                return (
                  <div key={k.label} style={{
                    background: "white", borderRadius: 14, padding: "20px 22px",
                    border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ background: k.bg, borderRadius: 10, padding: 9 }}>
                        <Icon size={18} color={k.color} />
                      </div>
                      <span style={{
                        fontSize: 11,
                        color: stat.delta_month > 0 ? "#059669" : "#64748b",
                        fontWeight: 500,
                        background: stat.delta_month > 0 ? "#ecfdf5" : "#f8fafc",
                        borderRadius: 12,
                        padding: "2px 8px",
                      }}>
                        {formatDelta(stat.delta_month, k.label)}
                      </span>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: "#0a1628", lineHeight: 1 }}>
                      {stat.total.toLocaleString("en-US")}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>{k.label}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: "0 0 18px" }}>Adoption by School Board</h3>
                {adoptionData.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No school board data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={adoptionData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(v: number, n: string) => [v, n === "actifs" ? "Active teachers" : "Total teachers"]}
                      />
                      <Bar dataKey="total" fill="#dff3ff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actifs" fill="#004aad" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: 0 }}>Student Records Growth</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <TrendingUp size={14} color={data.growth_percent_year >= 0 ? "#059669" : "#ef4444"} />
                    <span style={{ fontSize: 12, color: data.growth_percent_year >= 0 ? "#059669" : "#ef4444", fontWeight: 600 }}>
                      {data.growth_percent_year >= 0 ? "+" : ""}{data.growth_percent_year}% this year
                    </span>
                  </div>
                </div>
                {growthData.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No student growth data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={growthDomain} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Line type="monotone" dataKey="eleves" stroke="#38b6ff" strokeWidth={2.5} dot={{ fill: "#38b6ff", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
              <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: 0 }}>Recent Activity</h3>
                </div>
                {data.recent_activity.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No recent activity.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {data.recent_activity.map((a, i) => {
                      const Icon = activityIcons[a.category] ?? activityIcons[a.type] ?? Edit3;
                      const color = activityColors[a.category] ?? activityColors[a.type] ?? "#38b6ff";
                      return (
                        <div key={a.id} style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "10px 0",
                          borderBottom: i < data.recent_activity.length - 1 ? "1px solid #f8fafc" : "none",
                        }}>
                          <div style={{ background: `${color}15`, borderRadius: 8, padding: 7, flexShrink: 0, marginTop: 1 }}>
                            <Icon size={14} color={color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.4 }}>
                              <span style={{ color: "#64748b" }}>{a.action} </span>
                              <span style={{ fontWeight: 500 }}>{a.target}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{a.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0a1628", margin: "0 0 18px" }}>System Alerts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.alerts.map((a, i) => {
                    const colors = { warning: "#d97706", info: "#004aad", success: "#059669" };
                    const bgs = { warning: "#fffbeb", info: "#eff6ff", success: "#ecfdf5" };
                    const type = a.type as keyof typeof colors;
                    const color = colors[type] ?? colors.info;
                    const bg = bgs[type] ?? bgs.info;
                    const Icon = alertIcons[type] ?? AlertCircle;
                    return (
                      <div key={i} style={{ background: bg, borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{a.message}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628", marginBottom: 10 }}>Platform Health</div>
                  {[
                    { label: "API Availability", value: data.health.api_availability, ok: true },
                    { label: "Avg Response Time", value: `${data.health.avg_response_ms}ms`, ok: data.health.avg_response_ms < 500 },
                    { label: "Storage Used", value: `${data.health.storage_used_percent}%`, ok: data.health.storage_used_percent < 85 },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? "#059669" : "#ff5757" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
