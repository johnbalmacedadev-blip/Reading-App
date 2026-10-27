import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3, Users, School, LogOut,
  TrendingUp, AlertTriangle, CheckCircle2, ChevronDown,
  Settings, ArrowUpRight, ArrowRight,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const classes = [
  { id: 1, name: "Maternelle A", teacher: "Mme Gisèle Martineau", grade: "Maternelle", students: 22, enVoie: 91, aSurveiller: 5, aRisque: 4, benchmark: 2, avgAtelier: 2 },
  { id: 2, name: "Maternelle B", teacher: "Mme Isabelle Bouchard", grade: "Maternelle", students: 21, enVoie: 86, aSurveiller: 9, aRisque: 5, benchmark: 2, avgAtelier: 2 },
  { id: 3, name: "Jardin A",     teacher: "M. François Leblanc",   grade: "Jardin",     students: 24, enVoie: 79, aSurveiller: 13, aRisque: 8, benchmark: 6, avgAtelier: 5 },
  { id: 4, name: "Jardin B",     teacher: "Mme Sophie Fortin",     grade: "Jardin",     students: 23, enVoie: 74, aSurveiller: 17, aRisque: 9, benchmark: 6, avgAtelier: 4 },
  { id: 5, name: "1re année A",  teacher: "Mme Amélie Côté",       grade: "1re année",  students: 25, enVoie: 72, aSurveiller: 16, aRisque: 12, benchmark: 10, avgAtelier: 8 },
  { id: 6, name: "1re année B",  teacher: "M. David Tremblay",     grade: "1re année",  students: 24, enVoie: 67, aSurveiller: 21, aRisque: 12, benchmark: 10, avgAtelier: 7 },
  { id: 7, name: "2e année A",   teacher: "Mme Nathalie Martin",   grade: "2e année",   students: 26, enVoie: 77, aSurveiller: 15, aRisque: 8, benchmark: 14, avgAtelier: 12 },
  { id: 8, name: "2e année B",   teacher: "M. Patrick Gauthier",   grade: "2e année",   students: 25, enVoie: 68, aSurveiller: 20, aRisque: 12, benchmark: 14, avgAtelier: 11 },
];

const gradeProgress = [
  { grade: "Maternelle", benchmark: 2, target: 100, achieved: 88, color: "#29b6f6" },
  { grade: "Jardin",     benchmark: 6, target: 80,  achieved: 76, color: "#2e7d32" },
  { grade: "1re année",  benchmark: 10, target: 80,  achieved: 70, color: "#d97706" },
  { grade: "2e année",   benchmark: 14, target: 80,  achieved: 73, color: "#7c3aed" },
];

const MONTH_FR_TO_KEY: Record<string, "month.sep" | "month.oct" | "month.nov" | "month.dec" | "month.jan" | "month.feb" | "month.mar"> = {
  Sept: "month.sep",
  Oct: "month.oct",
  Nov: "month.nov",
  Déc: "month.dec",
  Jan: "month.jan",
  Fév: "month.feb",
  Mars: "month.mar",
};

const GRADE_LABEL_KEYS: Record<string, "grade.kindergarten" | "grade.garden" | "grade.grade1" | "grade.grade2"> = {
  Maternelle: "grade.kindergarten",
  Jardin: "grade.garden",
  "1re année": "grade.grade1",
  "2e année": "grade.grade2",
const trendData = [
  { month: "Sept", taux: 58 }, { month: "Oct", taux: 63 }, { month: "Nov", taux: 67 },
  { month: "Déc", taux: 70 }, { month: "Jan", taux: 73 }, { month: "Fév", taux: 75 },
  { month: "Mars", taux: 76 },
];

const atRisk = [
  { name: "Hugo Morin",        class: "Jardin A",     grade: "Jardin",    atelier: 2,  flag: "Conscience phonologique" },
  { name: "Charlotte Gagnon",  class: "1re année B",  grade: "1re année", atelier: 5, flag: "Correspondances G-P" },
  { name: "Mathieu Lapointe",  class: "2e année B",   grade: "2e année",  atelier: 9, flag: "Fluidité" },
  { name: "Léa Simard",        class: "Jardin B",     grade: "Jardin",    atelier: 2,  flag: "Conscience phonologique" },
  { name: "Antoine Bergeron",  class: "1re année A",  grade: "1re année", atelier: 6, flag: "Décodage" },
];

export function SchoolPortal() {
  const navigate = useNavigate();
  const { t, auto } = useLanguage();
  const [year, setYear] = useState("2025-2026");

  const menuItems = [
    { icon: Users,      label: t("common.classes"), active: true,  path: "/school" },
    { icon: BarChart3,  label: t("nav.reports"),    active: false, path: "/school/reports" },
    { icon: Settings,   label: t("nav.settings"),   active: false, path: "/school/settings" },
  ];

  const totalStudents = classes.reduce((s, c) => s + c.students, 0);
  const avgEnVoie = Math.round(classes.reduce((s, c) => s + c.enVoie, 0) / classes.length);
  const totalAtRisk = classes.reduce((s, c) => s + Math.round(c.students * c.aRisque / 100), 0);

  const trendChartData = trendData.map((row) => ({
    ...row,
    month: MONTH_FR_TO_KEY[row.month] ? t(MONTH_FR_TO_KEY[row.month]) : auto(row.month),
  }));

  // Group classes by grade in order: Maternelle, Jardin, 1re année, 2e année
  const gradeOrder = ["Maternelle", "Jardin", "1re année", "2e année"];
  const classesByGrade = gradeOrder.map(grade => ({
    grade,
    classes: classes.filter(c => c.grade === grade)
  })).filter(g => g.classes.length > 0);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="mb-10 min-w-0">
          <BrandMark height={34} />
          <p className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>{t("school.portal")}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button key={label} onClick={() => navigate(path)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm"
              style={{ background: active ? "#dff3ff" : "transparent", color: active ? "#004aad" : "#444", fontWeight: active ? 600 : 400 }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <LangToggle />
        <button onClick={() => navigate("/")} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm" style={{ color: "#ff5757" }}>
          <LogOut className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <School className="w-5 h-5" style={{ color: "#004aad" }} />
              <span className="text-sm font-medium" style={{ color: "#004aad" }}>École Laurier-Trudeau</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#004aad" }}>{t("school.classView")}</h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>{t("school.classPerfSubtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={year} onChange={e => setYear(e.target.value)}
                className="px-4 py-2.5 rounded-xl appearance-none pr-9 text-sm"
                style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}>
                <option value="2025-2026">2025–2026</option>
                <option value="2024-2025">2024–2025</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "#004aad", color: "#fff" }}>DL</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: t("school.enrolledStudents"), value: totalStudents,   icon: Users,         bg: "#dff3ff", iconColor: "#004aad" },
            { label: t("common.classes"),          value: classes.length, icon: School,         bg: "#dff3ff", iconColor: "#004aad" },
            { label: t("school.onTrackAvg"),       value: `${avgEnVoie}%`, icon: CheckCircle2, bg: "#c9e265", iconColor: "#1a4a00" },
            { label: t("school.atRiskStudents"),   value: totalAtRisk,    icon: AlertTriangle,  bg: "#ffdddd", iconColor: "#cc0000" },
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

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Grade benchmarks */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("school.gradeBenchmarks")}</h2>
            <div className="space-y-4">
              {gradeProgress.map(({ grade, benchmark, achieved, color }) => (
                <div key={grade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: "#333" }}>{GRADE_LABEL_KEYS[grade] ? t(GRADE_LABEL_KEYS[grade]) : auto(grade)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#888" }}>{t("school.benchmarkLabel")} {benchmark}</span>
                      <span className="text-sm font-bold" style={{ color }}>{achieved}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${achieved}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend line */}
          <div className="col-span-2 rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("school.progressionYear")}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis domain={[50, 85]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, t("common.onTrack")]} />
                <Line type="monotone" dataKey="taux" stroke="#004aad" strokeWidth={2.5} dot={{ fill: "#004aad", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classes by Grade Level */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("school.classesSummary")}</h2>
          <div className="space-y-6">
            {classesByGrade.map(({ grade, classes: gradeClasses }) => (
              <div key={grade}>
                <h3 className="text-sm font-bold mb-3 px-3 py-1.5 rounded-lg inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>
                  {GRADE_LABEL_KEYS[grade] ? t(GRADE_LABEL_KEYS[grade]) : auto(grade)}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {gradeClasses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/class/${c.id}`)}
                      className="p-4 rounded-xl text-left transition-all hover:shadow-md group"
                      style={{ background: "#f7ffd6", border: "1px solid #c9e265" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm" style={{ color: "#004aad" }}>{c.name}</h4>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#38b6ff" }} />
                      </div>
                      <p className="text-xs mb-3" style={{ color: "#666" }}>{c.teacher}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p style={{ color: "#888" }}>{t("common.students")}</p>
                          <p className="font-semibold" style={{ color: "#004aad" }}>{c.students}</p>
                        </div>
                        <div>
                          <p style={{ color: "#888" }}>{t("common.onTrack")}</p>
                          <p className="font-semibold" style={{ color: c.enVoie >= 75 ? "#2e7d32" : c.enVoie >= 65 ? "#d97706" : "#dc2626" }}>{c.enVoie}%</p>
                        </div>
                        <div>
                          <p style={{ color: "#888" }}>{t("school.avgWorkshopShort")}</p>
                          <p className="font-semibold" style={{ color: "#004aad" }}>{c.avgAtelier}/{c.benchmark}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-risk students */}
        <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#dc2626" }} />
              <h2 className="font-bold text-base" style={{ color: "#004aad" }}>{t("school.prioritySupport")}</h2>
            </div>
            <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#38b6ff" }}>
              Voir tous <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {atRisk.map((s, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: "#fff8f8", border: "1px solid #ffe0e0" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#ffdddd", color: "#cc0000" }}>
                  {s.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#333" }}>{s.name}</p>
                  <p className="text-xs" style={{ color: "#888" }}>{s.class}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>{t("common.atelier")} {s.atelier}</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#ffdddd", color: "#cc0000" }}>{s.flag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
