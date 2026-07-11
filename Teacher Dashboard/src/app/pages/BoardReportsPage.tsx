import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, TrendingUp, School, Users, Download, Loader2,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { BoardLayout } from "../components/BoardLayout";
import { boardReportsApi, type BoardReportsData } from "../api/client";
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

const BENCHMARK_COLORS = ["#3b82f6", "#3b82f6", "#fbbf24", "#ef4444"];

function shortSchoolName(name: string): string {
  return name.replace(/^École\s+/i, "").replace(/^Ecole\s+/i, "");
}

export function BoardReportsPage() {
  const { t, tp, auto: a } = useLanguage();
  const [data, setData] = useState<BoardReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");
  const [viewLevel, setViewLevel] = useState<"board" | "school">("board");
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [schoolSubView, setSchoolSubView] = useState<"overview" | "classes" | "students">("overview");
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<number | null>(null);

  const loadReports = useCallback(async (schoolYear?: string, schoolId?: number | null, classId?: number | null) => {
    setLoading(true);
    setError("");
    try {
      const result = await boardReportsApi.get({
        school_year: schoolYear || undefined,
        school_id: schoolId ?? undefined,
        class_id: classId ?? undefined,
      });
      setData(result);
      if (!schoolYear && result.school_year) {
        setYear(result.school_year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(year || undefined, selectedSchool, selectedClassForStudents);
  }, [loadReports, year, selectedSchool, selectedClassForStudents]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
  };

  const schools = data?.schools ?? [];
  const summary = data?.summary;
  const selectedSchoolData = data?.school ?? (selectedSchool ? schools.find((s) => s.id === selectedSchool) : null);
  const classesForSchool = data?.classes ?? [];
  const studentsForClass = data?.students ?? [];

  const trendChartData = useMemo(
    () =>
      (data?.success_rate_by_month ?? []).map((d) => ({
        month: MONTH_KEYS[d.month] ? t(MONTH_KEYS[d.month]) : d.month,
        taux: d.rate,
      })),
    [data, t]
  );

  const schoolBarData = useMemo(
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

  const statusLabel = (status: string) => {
    if (status === "on_track") return t("common.onTrack");
    if (status === "monitor") return t("common.monitor");
    return t("common.atRisk");
  };

  const statusStyle = (status: string) => {
    if (status === "on_track") return { background: "#ecfdf5", color: "#059669" };
    if (status === "monitor") return { background: "#fffbeb", color: "#d97706" };
    return { background: "#fff1f2", color: "#dc2626" };
  };

  const yearOptions = data?.available_years?.length ? data.available_years : [year || "2025-2026"];
  const boardName = data?.board.name ?? t("board.boardName");

  return (
    <BoardLayout activeNav="reports">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#004aad" }}>
            {t("nav.reports")} — {boardName}
          </h1>
          <p className="text-base" style={{ color: "#666" }}>
            {a("Analyse détaillée des performances à tous les niveaux")}
          </p>
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
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48" }}>
          {error}
          <button
            onClick={() => loadReports(year, selectedSchool, selectedClassForStudents)}
            className="ml-3 underline"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#e11d48" }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold" style={{ color: "#004aad" }}>{a("Niveau de visualisation:")}</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setViewLevel("board"); setSelectedSchool(null); setSelectedClassForStudents(null); }}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: viewLevel === "board" ? "#004aad" : "#dff3ff", color: viewLevel === "board" ? "#ffffff" : "#004aad" }}
            >
              {a("Conseil entier")}
            </button>
            <button
              onClick={() => { setViewLevel("school"); setSchoolSubView("overview"); }}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: viewLevel === "school" ? "#004aad" : "#dff3ff", color: viewLevel === "school" ? "#ffffff" : "#004aad" }}
            >
              {a("Par école")}
            </button>
          </div>
        </div>

        {viewLevel === "school" && (
          <div className="mt-4">
            <label className="text-sm font-semibold mb-2 block" style={{ color: "#004aad" }}>{a("Sélectionner une école:")}</label>
            <div className="relative">
              <select
                value={selectedSchool || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setSelectedSchool(id || null);
                  setSchoolSubView("overview");
                  setSelectedClassForStudents(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl appearance-none pr-9 text-sm"
                style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
              >
                <option value="">{a("-- Choisir une école --")}</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{a(s.name)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24" style={{ color: "#64748b" }}>
          <Loader2 className="animate-spin" size={22} /> {t("common.loading")}
        </div>
      ) : (
        <>
          {viewLevel === "board" && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: t("board.participatingSchools"), value: summary?.participating_schools ?? 0, icon: School, bg: "#dff3ff", iconColor: "#004aad" },
                  { label: t("board.totalStudents"), value: (summary?.total_students ?? 0).toLocaleString("fr-CA"), icon: Users, bg: "#dff3ff", iconColor: "#004aad" },
                  { label: t("board.avgOnTrack"), value: `${summary?.avg_on_track ?? 0}%`, icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
                  { label: t("board.boardTrend"), value: `${summary?.latest_trend ?? 0}%`, icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
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
                  <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("school.gradeBenchmarks")}</h2>
                  {(data?.grade_benchmarks ?? []).length === 0 ? (
                    <p className="text-sm" style={{ color: "#94a3b8" }}>No benchmark data yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {(data?.grade_benchmarks ?? []).map((benchmark, index) => (
                        <div
                          key={benchmark.grade_key}
                          className="p-4 rounded-xl text-center"
                          style={{ background: "#f7ffd6", border: `2px solid ${BENCHMARK_COLORS[index % BENCHMARK_COLORS.length]}` }}
                        >
                          <p className="text-xs mb-2" style={{ color: "#666" }}>
                            {a(`Fin de ${t(benchmark.grade_key as Parameters<typeof t>[0]).toLowerCase()}`)}
                          </p>
                          <p className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{benchmark.avg_completed}</p>
                          <p className="text-xs" style={{ color: "#666" }}>
                            {a("Moy.")} · {tp("evaluation.workshopN", { n: benchmark.target_atelier })} {a("cible")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-base" style={{ color: "#004aad" }}>{t("board.bySchool")}</h2>
                  <button className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm" style={{ background: "#38b6ff", color: "#ffffff" }}>
                    <Download className="w-4 h-4" />
                    {t("common.export")}
                  </button>
                </div>
                {schoolBarData.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>No schools found for this board.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, schoolBarData.length * 36)}>
                    <BarChart data={schoolBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#555" }} width={140} />
                      <Tooltip formatter={(v: number) => [`${v}%`, t("common.onTrack")]} />
                      <Bar dataKey="enVoie" radius={[0, 6, 6, 0]}>
                        {schoolBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.enVoie >= 80 ? "#c9e265" : entry.enVoie >= 70 ? "#38b6ff" : "#ff5757"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {viewLevel === "school" && selectedSchoolData && (
            <>
              <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <div className="flex items-center gap-3 mb-6">
                  <School className="w-8 h-8" style={{ color: "#004aad" }} />
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: "#004aad" }}>{a(selectedSchoolData.name)}</h2>
                    <p className="text-sm" style={{ color: "#666" }}>{selectedSchoolData.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: t("board.totalStudents"), value: selectedSchoolData.students, bg: "#dff3ff" },
                    { label: t("common.onTrack"), value: `${selectedSchoolData.on_track}%`, bg: "#c9e265" },
                    { label: t("common.monitor"), value: `${selectedSchoolData.monitor}%`, bg: "#ffde59" },
                    { label: t("common.atRisk"), value: `${selectedSchoolData.at_risk}%`, bg: "#ff5757" },
                  ].map(({ label, value, bg }) => (
                    <div key={label} className="p-4 rounded-xl" style={{ background: bg }}>
                      <p className="text-xs mb-1" style={{ color: "#000" }}>{label}</p>
                      <p className="text-2xl font-bold" style={{ color: "#004aad" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <div className="flex gap-2">
                  {(["overview", "classes", "students"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setSchoolSubView(tab);
                        if (tab !== "students") setSelectedClassForStudents(null);
                      }}
                      className="px-4 py-2 rounded-xl text-sm transition-all"
                      style={{
                        background: schoolSubView === tab ? "#004aad" : "#dff3ff",
                        color: schoolSubView === tab ? "#ffffff" : "#004aad",
                      }}
                    >
                      {tab === "overview" ? t("common.overview") : tab === "classes" ? `${t("common.classes")} (${classesForSchool.length})` : t("common.students")}
                    </button>
                  ))}
                </div>
              </div>

              {schoolSubView === "overview" && (
                <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                  <h3 className="font-bold text-base mb-4" style={{ color: "#004aad" }}>{a("Aperçu de l'école")}</h3>
                  <p className="text-sm" style={{ color: "#666" }}>
                    {a(`Vue d'ensemble des performances de ${selectedSchoolData.name}. Utilisez les onglets ci-dessus pour explorer les classes et les élèves.`)}
                  </p>
                </div>
              )}

              {schoolSubView === "classes" && (
                <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                  <h3 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{a(`Classes de ${selectedSchoolData.name}`)}</h3>
                  {classesForSchool.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: "#666" }}>{a("Aucune classe disponible.")}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {classesForSchool.map((cls) => (
                        <div key={cls.id} className="p-5 rounded-xl" style={{ background: "#f7ffd6", border: "1px solid #c9e265" }}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-base" style={{ color: "#004aad" }}>{a(cls.name)}</h4>
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>{a(cls.grade)}</span>
                          </div>
                          <p className="text-xs mb-3" style={{ color: "#666" }}>{a(cls.teacher)}</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p style={{ color: "#888" }}>{t("common.students")}</p>
                              <p className="font-semibold text-lg" style={{ color: "#004aad" }}>{cls.students}</p>
                            </div>
                            <div>
                              <p style={{ color: "#888" }}>{t("common.onTrack")}</p>
                              <p className="font-semibold text-lg" style={{ color: cls.on_track >= 75 ? "#2e7d32" : cls.on_track >= 65 ? "#d97706" : "#dc2626" }}>{cls.on_track}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {schoolSubView === "students" && (
                <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-base" style={{ color: "#004aad" }}>{a(`Élèves de ${selectedSchoolData.name}`)}</h3>
                    {classesForSchool.length > 0 && (
                      <div className="relative" style={{ minWidth: "200px" }}>
                        <select
                          value={selectedClassForStudents || ""}
                          onChange={(e) => setSelectedClassForStudents(parseInt(e.target.value, 10) || null)}
                          className="w-full px-4 py-2 rounded-xl appearance-none pr-9 text-sm"
                          style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
                        >
                          <option value="">{t("reports.allClasses")}</option>
                          {classesForSchool.map((c) => (
                            <option key={c.id} value={c.id}>{a(c.name)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
                      </div>
                    )}
                  </div>
                  {!selectedClassForStudents ? (
                    <p className="text-sm text-center py-8" style={{ color: "#666" }}>{t("reports.selectClass")}</p>
                  ) : studentsForClass.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: "#666" }}>{a("Aucun élève disponible pour cette classe.")}</p>
                  ) : (
                    <div className="space-y-3">
                      {studentsForClass.map((student) => (
                        <div
                          key={student.id}
                          className="w-full p-4 rounded-xl flex items-center justify-between"
                          style={{ background: "#f7ffd6", border: "1px solid #c9e265" }}
                        >
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "#004aad" }}>{a(student.name)}</p>
                            <p className="text-xs" style={{ color: "#666" }}>{a(student.grade)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>
                              {tp("evaluation.workshopN", { n: student.current_atelier })}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full" style={statusStyle(student.status)}>
                              {statusLabel(student.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {viewLevel === "school" && !selectedSchoolData && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#94a3b8" }}>
              {a("Sélectionnez une école pour voir les rapports détaillés.")}
            </div>
          )}
        </>
      )}
    </BoardLayout>
  );
}
