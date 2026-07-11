import { useCallback, useEffect, useMemo, useState } from "react";
import {
  School, TrendingUp, CheckCircle2, ChevronDown,
  ArrowUpRight, Users, Building2, Loader2,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { boardDashboardApi, type BoardDashboardData } from "../api/client";
import { BoardLayout } from "../components/BoardLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const MONTH_KEYS: Record<string, "month.sep" | "month.oct" | "month.nov" | "month.dec" | "month.jan" | "month.feb" | "month.mar"> = {
  Sep: "month.sep",
  Oct: "month.oct",
  Nov: "month.nov",
  Dec: "month.dec",
  Jan: "month.jan",
  Feb: "month.feb",
  Mar: "month.mar",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function shortSchoolName(name: string): string {
  return name.replace(/^École\s+/i, "").replace(/^Ecole\s+/i, "");
}

export function SchoolBoardDashboard() {
  const { t, auto: a } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<BoardDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");

  const loadDashboard = useCallback(async (schoolYear?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await boardDashboardApi.get(schoolYear);
      setData(result);
      if (!schoolYear && result.school_year) {
        setYear(result.school_year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    loadDashboard(newYear);
  };

  const schools = data?.schools ?? [];
  const summary = data?.summary;

  const trendChartData = useMemo(
    () =>
      (data?.success_rate_by_month ?? []).map((d) => ({
        month: MONTH_KEYS[d.month] ? t(MONTH_KEYS[d.month]) : d.month,
        taux: d.rate,
      })),
    [data, t]
  );

  const gradeChartData = useMemo(
    () =>
      (data?.results_by_grade ?? []).map((d) => ({
        grade: t(d.grade_key as Parameters<typeof t>[0]),
        conseil: d.board,
        provincial: d.provincial,
      })),
    [data, t]
  );

  const schoolBarChartData = useMemo(
    () => schools.map((s) => ({ name: a(shortSchoolName(s.name)), enVoie: s.on_track })),
    [schools, a]
  );

  const trendDomain = useMemo(() => {
    const values = trendChartData.map((d) => d.taux);
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(5, Math.round((max - min) * 0.15));
    return [Math.max(0, min - padding), Math.min(100, max + padding)];
  }, [trendChartData]);

  const boardName = data?.board.name ?? user?.name ?? t("board.boardName");
  const yearOptions = data?.available_years?.length ? data.available_years : [year || "2025-2026"];

  return (
    <BoardLayout activeNav="overview">
      <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5" style={{ color: "#004aad" }} />
              <span className="text-sm font-medium" style={{ color: "#004aad" }}>{boardName}</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#004aad" }}>{t("common.overview")}</h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>{a("Vue d'ensemble des performances du conseil")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl appearance-none pr-9 text-sm"
                style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y.replace("-", "–")}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "#004aad", color: "#fff" }}>
              {initials(boardName)}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48" }}>
            {error}
            <button onClick={() => loadDashboard(year)} className="ml-3 underline" style={{ background: "none", border: "none", cursor: "pointer", color: "#e11d48" }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24" style={{ color: "#64748b" }}>
            <Loader2 className="animate-spin" size={22} /> {t("common.loading")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: t("board.participatingSchools"), value: summary?.participating_schools ?? 0, icon: School, bg: "#dff3ff", iconColor: "#004aad" },
                { label: t("board.totalStudents"), value: (summary?.total_students ?? 0).toLocaleString("fr-CA"), icon: Users, bg: "#dff3ff", iconColor: "#004aad" },
                { label: t("board.activeTeachers"), value: summary?.active_teachers ?? 0, icon: CheckCircle2, bg: "#c9e265", iconColor: "#1a4a00" },
                { label: t("board.avgOnTrack"), value: `${summary?.avg_on_track ?? 0}%`, icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
              ].map(({ label, value, icon: Icon, bg, iconColor }) => (
                <div key={label} className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                  </div>
                  <p className="text-xs mb-1" style={{ color: "#666" }}>{label}</p>
                  <p className="text-2xl font-bold" style={{ color: "#004aad" }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>
                  {t("board.boardTrend")} ({year.replace("-", "–")})
                </h2>
                {trendChartData.length === 0 ? (
                  <p className="text-sm" style={{ color: "#94a3b8" }}>No trend data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                      <YAxis domain={trendDomain} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                      <Tooltip formatter={(v: number) => [`${v}%`, t("common.onTrack")]} />
                      <Line type="monotone" dataKey="taux" stroke="#004aad" strokeWidth={2.5} dot={{ fill: "#004aad", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("board.vsProvincial")}</h2>
                {gradeChartData.length === 0 ? (
                  <p className="text-sm" style={{ color: "#94a3b8" }}>No grade data yet.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={gradeChartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#888" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                        <Tooltip formatter={(v: number, name: string) => [`${v}%`, name === "conseil" ? t("board.ours") : t("board.provincial")]} />
                        <Bar dataKey="conseil" fill="#004aad" radius={[4, 4, 0, 0]} name="conseil" />
                        <Bar dataKey="provincial" fill="#dff3ff" radius={[4, 4, 0, 0]} name="provincial" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#004aad" }} /><span className="text-xs" style={{ color: "#555" }}>{t("board.ours")}</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#dff3ff", border: "1px solid #aaa" }} /><span className="text-xs" style={{ color: "#555" }}>{t("board.provincial")}</span></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
              <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("board.bySchool")}</h2>
              {schoolBarChartData.length === 0 ? (
                <p className="text-sm" style={{ color: "#94a3b8" }}>No school data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, schoolBarChartData.length * 36)}>
                  <BarChart data={schoolBarChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#555" }} width={140} />
                    <Tooltip formatter={(v: number) => [`${v}%`, t("common.onTrack")]} />
                    <Bar dataKey="enVoie" radius={[0, 6, 6, 0]}>
                      {schoolBarChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.enVoie >= 80 ? "#c9e265" : entry.enVoie >= 70 ? "#38b6ff" : "#ff5757"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base" style={{ color: "#004aad" }}>{t("board.schoolDetails")}</h2>
                <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#38b6ff" }}>
                  {t("common.export")} <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {schools.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>No schools found for this board.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "2px solid #dff3ff" }}>
                      {[t("nav.schools"), t("board.city"), t("nav.students"), t("nav.teachers"), t("common.onTrack"), t("common.monitor"), t("common.atRisk"), t("common.trend")].map((h) => (
                        <th key={h} className="pb-3 text-left font-semibold" style={{ color: "#888", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < schools.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                        <td className="py-3 font-semibold text-sm" style={{ color: "#004aad" }}>{a(s.name)}</td>
                        <td className="py-3 text-xs" style={{ color: "#888" }}>{a(s.city)}</td>
                        <td className="py-3 font-medium" style={{ color: "#333" }}>{s.students}</td>
                        <td className="py-3" style={{ color: "#555" }}>{s.teachers}</td>
                        <td className="py-3 font-bold" style={{ color: s.on_track >= 80 ? "#2e7d32" : s.on_track >= 70 ? "#d97706" : "#dc2626" }}>{s.on_track}%</td>
                        <td className="py-3" style={{ color: "#d97706" }}>{s.monitor}%</td>
                        <td className="py-3" style={{ color: s.at_risk >= 9 ? "#dc2626" : "#555" }}>{s.at_risk}%</td>
                        <td className="py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                            background: s.trend.startsWith("+") && parseInt(s.trend, 10) >= 0 ? "#f0fff4" : s.trend.startsWith("-") ? "#fff1f2" : "#f8fafc",
                            color: s.trend.startsWith("+") && parseInt(s.trend, 10) > 0 ? "#2e7d32" : s.trend.startsWith("-") ? "#dc2626" : "#64748b",
                          }}>{s.trend}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
    </BoardLayout>
  );
}
