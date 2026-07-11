import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen,
  Users,
  Download,
  CheckCircle2, TrendingUp, AlertCircle, MinusCircle, ChevronDown, Loader2,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { UserAvatar } from "../components/UserAvatar";
import { TeacherLayout } from "../components/TeacherLayout";
import { useLanguage, type TranslationKey } from "../i18n";
import { teacherReportsApi, type TeacherReportsData } from "../api/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const gradeLevelExpectations: {
  labelKey: TranslationKey;
  workshop: number;
  subtitleKey: TranslationKey;
}[] = [
  { labelKey: "student.benchmarkEndK", workshop: 2, subtitleKey: "reports.benchmark.unit1" },
  { labelKey: "student.benchmarkEndPreK", workshop: 6, subtitleKey: "reports.benchmark.unit1Complete" },
  { labelKey: "student.benchmarkEndG1", workshop: 8, subtitleKey: "reports.benchmark.units1to3" },
  { labelKey: "student.benchmarkEndG2", workshop: 15, subtitleKey: "reports.benchmark.allUnits" },
];

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, isPercent = false }: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; isPercent?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
      <div className="flex justify-end mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-xs mb-1" style={{ color: "#6b7280" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: "#004aad" }}>
        {value}{isPercent ? "%" : ""}
      </p>
    </div>
  );
}

function GradeCard({ labelKey, workshop, subtitleKey }: { labelKey: TranslationKey; workshop: number; subtitleKey: TranslationKey }) {
  const { t } = useLanguage();
  return (
    <div className="p-5 rounded-xl text-center" style={{ background: "#dff3ff", border: "2px solid #38b6ff" }}>
      <p className="text-sm mb-2" style={{ color: "#374151" }}>{t(labelKey)}</p>
      <p className="text-4xl font-bold mb-1" style={{ color: "#004aad" }}>{workshop}</p>
      <p className="text-xs" style={{ color: "#6b7280" }}>{t(subtitleKey)}</p>
    </div>
  );
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { t, tp, auto: a } = useLanguage();
  const [reports, setReports] = useState<TeacherReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");

  const loadReports = useCallback(async (year?: string, classId?: number | "all") => {
    setLoading(true);
    setError("");
    try {
      const data = await teacherReportsApi.get({
        school_year: year || undefined,
        class_id: classId && classId !== "all" ? classId : undefined,
      });
      setReports(data);
      if (!year && data.school_year) {
        setSchoolYear(data.school_year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(schoolYear || undefined, selectedClassId);
  }, [loadReports, schoolYear, selectedClassId]);

  const handleYearChange = (year: string) => {
    setSchoolYear(year);
  };

  const handleClassChange = (value: string) => {
    setSelectedClassId(value === "all" ? "all" : Number(value));
  };

  const yearOptions = reports?.available_years.length
    ? reports.available_years
    : schoolYear
      ? [schoolYear]
      : ["2025-2026"];

  const summary = reports?.summary ?? {
    num_classes: 0,
    num_students: 0,
    good_grades: 0,
    satisfactory: 0,
    failing: 0,
    not_submitted: 0,
  };

  const performance = reports?.class_performance ?? {
    threshold: 0,
    on_track: 0,
    progressing: 0,
    needing_support: 0,
    distribution: [],
    engaged_students: [],
    support_students: [],
    all_students: [],
  };

  const workshopRangeData = (reports?.workshop_range ?? []).map((row) => ({
    name: t(row.key as TranslationKey),
    value: row.value,
  }));

  const progressData = (reports?.progress_over_time ?? []).map((row) => ({
    month: t(row.month as TranslationKey),
    average: row.average,
  }));

  const distributionData = performance.distribution.map((row) => ({
    name: t(row.key as TranslationKey),
    value: row.value,
    color: row.color,
  }));

  const selectedClassLabel = selectedClassId === "all"
    ? t("reports.allClasses")
    : a(reports?.classes.find((c) => c.id === selectedClassId)?.name ?? "");

  return (
    <TeacherLayout activeNav="reports" contentClassName="flex-1 overflow-y-auto" >
      <div style={{ padding: "40px 48px" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{t("common.reports")}</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>{t("reports.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <UserAvatar size="md" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>{t("common.year")}</p>
            <div className="relative">
              <select
                value={schoolYear || reports?.school_year || yearOptions[0] || ""}
                onChange={(e) => handleYearChange(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl text-sm font-medium appearance-none cursor-pointer outline-none"
                style={{ background: "white", border: "1.5px solid #dff3ff", color: "#004aad" }}
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>{t("reports.selectClass")}</p>
            <div className="relative">
              <select
                value={selectedClassId === "all" ? "all" : String(selectedClassId)}
                onChange={(e) => handleClassChange(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl text-sm font-medium appearance-none cursor-pointer outline-none"
                style={{ background: "white", border: "1.5px solid #dff3ff", color: "#004aad" }}
              >
                <option value="all">{t("reports.allClasses")}</option>
                {(reports?.classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{a(c.name)}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin" size={32} style={{ color: "#004aad" }} />
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: "#fff1f2", color: "#be123c" }}>
            {error}
          </div>
        )}

        {!loading && reports && (
          <>
            <div className="grid grid-cols-6 gap-4 mb-7">
              <KpiCard label={t("reports.numClasses")} value={summary.num_classes} icon={BookOpen} iconBg="#dff3ff" iconColor="#004aad" />
              <KpiCard label={t("reports.numStudents")} value={summary.num_students} icon={Users} iconBg="#e0f2fe" iconColor="#0369a1" />
              <KpiCard label={t("reports.goodGrades")} value={summary.good_grades} icon={CheckCircle2} iconBg="#ecfdf5" iconColor="#15803d" isPercent />
              <KpiCard label={t("reports.satisfactoryGrades")} value={summary.satisfactory} icon={TrendingUp} iconBg="#fffbeb" iconColor="#b45309" isPercent />
              <KpiCard label={t("reports.failingGrades")} value={summary.failing} icon={AlertCircle} iconBg="#fff1f2" iconColor="#be123c" isPercent />
              <KpiCard label={t("reports.notSubmitted")} value={summary.not_submitted} icon={MinusCircle} iconBg="#f8fafc" iconColor="#94a3b8" isPercent />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-7">
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold" style={{ color: "#004aad" }}>{t("reports.classPerf")}</h2>
                  <button type="button" className="p-1.5 rounded-lg" style={{ background: "#dff3ff" }}>
                    <Download className="w-4 h-4" style={{ color: "#004aad" }} />
                  </button>
                </div>
                {workshopRangeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={workshopRangeData} barSize={44}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="value" fill="#38b6ff" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px]">
                    <p className="text-sm" style={{ color: "#94a3b8" }}>{t("reports.noData")}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold" style={{ color: "#004aad" }}>{t("reports.progressTime")}</h2>
                  <button type="button" className="p-1.5 rounded-lg" style={{ background: "#dff3ff" }}>
                    <Download className="w-4 h-4" style={{ color: "#004aad" }} />
                  </button>
                </div>
                {progressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Line type="monotone" dataKey="average" stroke="#38b6ff" strokeWidth={2.5}
                        dot={{ fill: "#38b6ff", r: 4, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px]">
                    <p className="text-sm" style={{ color: "#94a3b8" }}>{t("reports.noData")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-7 mb-7" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: "#004aad" }}>{t("reports.gradeExpectations")}</h2>
              <div className="grid grid-cols-4 gap-5">
                {gradeLevelExpectations.map((g) => (
                  <GradeCard key={g.labelKey} labelKey={g.labelKey} workshop={g.workshop} subtitleKey={g.subtitleKey} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-7 mb-7" style={{ background: "#ffffff", border: "1.5px solid #dff3ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
              <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
                {t("reports.classPerformance")} — {selectedClassLabel}
              </h2>

              <div className="rounded-xl p-5 mb-5 grid grid-cols-3 divide-x" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-center px-4">
                  <p className="text-3xl font-bold mb-1" style={{ color: "#c9e265" }}>{performance.on_track}</p>
                  <p className="text-sm" style={{ color: "#374151" }}>{tp("reports.onTrackThreshold", { threshold: performance.threshold })}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-3xl font-bold mb-1" style={{ color: "#ffde59" }}>{performance.progressing}</p>
                  <p className="text-sm" style={{ color: "#374151" }}>{t("reports.progressingStudents")}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-3xl font-bold mb-1" style={{ color: "#ff5757" }}>{performance.needing_support}</p>
                  <p className="text-sm" style={{ color: "#374151" }}>{t("reports.needsSupport")}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
                  <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.distribution")}</h3>
                  {distributionData.length > 0 && distributionData.some((d) => d.value > 0) ? (
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={distributionData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                            paddingAngle={3} dataKey="value">
                            {distributionData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {distributionData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                              <span className="text-xs" style={{ color: "#374151" }}>{item.name}</span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: "#004aad" }}>{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm" style={{ color: "#94a3b8" }}>{t("reports.noData")}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
                  <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.topStudents")}</h3>
                  {performance.engaged_students.length > 0 ? (
                    <div className="space-y-3">
                      {performance.engaged_students.map((s, i) => (
                        <div key={`${s.id}-${s.class_id}`} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#dff3ff" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: "#004aad" }}>#{i + 1}</span>
                            <span className="text-sm font-medium" style={{ color: "#1e293b" }}>{a(s.name)}</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: "#c9e265", color: "#1a3a00" }}>
                            {tp("evaluation.workshopN", { n: s.atelier })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm" style={{ color: "#94a3b8" }}>{t("reports.noData")}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
                  <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.needsSupport")}</h3>
                  {performance.support_students.length > 0 ? (
                    <div className="space-y-3">
                      {performance.support_students.map((s) => (
                        <div key={`${s.id}-${s.class_id}`} className="p-3 rounded-xl" style={{ background: "#fff1f2" }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium" style={{ color: "#1e293b" }}>{a(s.name)}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: "#ff5757", color: "white" }}>
                              {tp("evaluation.workshopN", { n: s.atelier })}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: "#94a3b8" }}>
                            {tp("reports.workshopsBehind", { count: s.gap })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm" style={{ color: "#94a3b8" }}>{t("reports.noSupportNeeded")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-7" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#004aad" }}>{t("reports.individualReports")}</h2>
              <p className="text-sm mb-5" style={{ color: "#6b7280" }}>
                {t("reports.individualReportsHint")}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {performance.all_students.map((student) => (
                  <button
                    key={`${student.id}-${student.class_id}`}
                    type="button"
                    onClick={() => navigate(`/student/${student.id}`, { state: { classId: student.class_id } })}
                    className="px-4 py-3 rounded-xl text-left text-sm font-medium transition-all hover:shadow-md"
                    style={{ background: "#dff3ff", border: "1px solid #b8e4ff", color: "#004aad" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c5e8ff"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dff3ff"; }}
                  >
                    {a(student.name)}
                  </button>
                ))}
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl text-left text-sm font-medium transition-all"
                  style={{ background: "white", border: "1.5px dashed #b8e4ff", color: "#38b6ff" }}
                  onClick={() => navigate("/dashboard")}
                >
                  {t("reports.viewAllStudents")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
