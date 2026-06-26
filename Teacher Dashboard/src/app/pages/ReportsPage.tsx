import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, BarChart3, User, LogOut, Users, Book, Download,
  CheckCircle2, TrendingUp, AlertCircle, MinusCircle, ChevronDown,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { LangToggle } from "../components/LangToggle";
import { useLanguage, type TranslationKey } from "../i18n";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

// ─── Mock data per class ───────────────────────────────────────────────────

const classData: Record<string, {
  numClasses: number; numStudents: number;
  goodGrades: number; satisfactory: number; failing: number; notSubmitted: number;
  workshopRange: { name: string; value: number }[];
  progressOverTime: { month: string; average: number }[];
  onTrack: number; progressing: number; needingSupport: number;
  threshold: number;
  distribution: { name: string; value: number; color: string }[];
  engagedStudents: { name: string; atelier: number }[];
  supportStudents: { name: string; atelier: number; gap: number }[];
  allStudents: { id: number; name: string }[];
}> = {
  "Toutes les classes": {
    numClasses: 6, numStudents: 141,
    goodGrades: 68, satisfactory: 22, failing: 7, notSubmitted: 3,
    workshopRange: [
      { name: "Ateliers Unité 1", value: 62 },
      { name: "Ateliers Unités 2-5", value: 47 },
      { name: "Ateliers Unités 6-10", value: 32 },
    ],
    progressOverTime: [
      { month: "Sept", average: 48 }, { month: "Oct", average: 56 },
      { month: "Nov", average: 63 }, { month: "Déc", average: 67 },
      { month: "Jan", average: 72 }, { month: "Fév", average: 75 },
      { month: "Mar", average: 77 }, { month: "Avr", average: 79 },
      { month: "Mai", average: 81 }, { month: "Juin", average: 83 },
    ],
    onTrack: 96, progressing: 31, needingSupport: 14, threshold: 22,
    distribution: [
      { name: "En voie / Acquis", value: 68, color: "#c9e265" },
      { name: "À surveiller", value: 22, color: "#ffde59" },
      { name: "À risque", value: 10, color: "#ff5757" },
    ],
    engagedStudents: [
      { name: "Émilie Côté", atelier: 15 },
      { name: "Isabelle Fortin", atelier: 14 },
      { name: "Antoine Bergeron", atelier: 13 },
    ],
    supportStudents: [
      { name: "Hugo Morin", atelier: 2, gap: 4 },
      { name: "David Roy", atelier: 3, gap: 3 },
      { name: "Zoé Dupuis", atelier: 4, gap: 4 },
    ],
    allStudents: [
      { id: 1, name: "Amélie Dubois" }, { id: 2, name: "Benjamin Tremblay" },
      { id: 3, name: "Charlotte Gagnon" }, { id: 4, name: "David Roy" },
      { id: 5, name: "Émilie Côté" }, { id: 6, name: "François Bouchard" },
      { id: 7, name: "Gabrielle Gauthier" }, { id: 8, name: "Hugo Morin" },
    ],
  },
  "Maternelle A": {
    numClasses: 1, numStudents: 22,
    goodGrades: 91, satisfactory: 5, failing: 4, notSubmitted: 0,
    workshopRange: [
      { name: "Ateliers Unité 1", value: 20 },
      { name: "Ateliers Unités 2-5", value: 0 },
      { name: "Ateliers Unités 6-10", value: 0 },
    ],
    progressOverTime: [
      { month: "Sept", average: 10 }, { month: "Oct", average: 25 },
      { month: "Nov", average: 40 }, { month: "Déc", average: 52 },
      { month: "Jan", average: 62 }, { month: "Fév", average: 70 },
      { month: "Mar", average: 75 }, { month: "Avr", average: 78 },
      { month: "Mai", average: 80 }, { month: "Juin", average: 82 },
    ],
    onTrack: 20, progressing: 1, needingSupport: 1, threshold: 2,
    distribution: [
      { name: "En voie / Acquis", value: 91, color: "#c9e265" },
      { name: "À surveiller", value: 5, color: "#ffde59" },
      { name: "À risque", value: 4, color: "#ff5757" },
    ],
    engagedStudents: [
      { name: "Sophie Lavoie", atelier: 4 },
      { name: "Lucas Bernard", atelier: 4 },
      { name: "Amélie Dubois", atelier: 3 },
    ],
    supportStudents: [
      { name: "Emma Côté", atelier: 1, gap: 1 },
    ],
    allStudents: [
      { id: 1, name: "Amélie Dubois" }, { id: 2, name: "Hugo Morin" },
      { id: 3, name: "Sophie Lavoie" }, { id: 4, name: "Lucas Bernard" },
      { id: 5, name: "Emma Côté" }, { id: 6, name: "Nathan Roy" },
    ],
  },
  "Jardin": {
    numClasses: 1, numStudents: 24,
    goodGrades: 79, satisfactory: 13, failing: 8, notSubmitted: 0,
    workshopRange: [
      { name: "Ateliers Unité 1", value: 19 },
      { name: "Ateliers Unités 2-5", value: 0 },
      { name: "Ateliers Unités 6-10", value: 0 },
    ],
    progressOverTime: [
      { month: "Sept", average: 22 }, { month: "Oct", average: 38 },
      { month: "Nov", average: 51 }, { month: "Déc", average: 60 },
      { month: "Jan", average: 67 }, { month: "Fév", average: 72 },
      { month: "Mar", average: 75 }, { month: "Avr", average: 77 },
      { month: "Mai", average: 78 }, { month: "Juin", average: 80 },
    ],
    onTrack: 19, progressing: 3, needingSupport: 2, threshold: 6,
    distribution: [
      { name: "En voie / Acquis", value: 79, color: "#c9e265" },
      { name: "À surveiller", value: 13, color: "#ffde59" },
      { name: "À risque", value: 8, color: "#ff5757" },
    ],
    engagedStudents: [
      { name: "Charlotte Gagnon", atelier: 6 },
      { name: "Olivia Roy", atelier: 5 },
      { name: "Noah Tremblay", atelier: 5 },
    ],
    supportStudents: [
      { name: "Mathieu Lapointe", atelier: 2, gap: 4 },
      { name: "Thomas Cloutier", atelier: 3, gap: 3 },
    ],
    allStudents: [
      { id: 6, name: "Charlotte Gagnon" }, { id: 7, name: "Mathieu Lapointe" },
      { id: 8, name: "Olivia Roy" }, { id: 9, name: "Noah Tremblay" },
      { id: 10, name: "Léa Fortin" }, { id: 11, name: "Thomas Cloutier" },
    ],
  },
  "1re année A": {
    numClasses: 1, numStudents: 25,
    goodGrades: 72, satisfactory: 16, failing: 8, notSubmitted: 4,
    workshopRange: [
      { name: "Ateliers Unité 1", value: 25 },
      { name: "Ateliers Unités 2-5", value: 18 },
      { name: "Ateliers Unités 6-10", value: 0 },
    ],
    progressOverTime: [
      { month: "Sept", average: 35 }, { month: "Oct", average: 48 },
      { month: "Nov", average: 58 }, { month: "Déc", average: 65 },
      { month: "Jan", average: 70 }, { month: "Fév", average: 74 },
      { month: "Mar", average: 76 }, { month: "Avr", average: 78 },
      { month: "Mai", average: 80 }, { month: "Juin", average: 82 },
    ],
    onTrack: 18, progressing: 4, needingSupport: 3, threshold: 8,
    distribution: [
      { name: "En voie / Acquis", value: 72, color: "#c9e265" },
      { name: "À surveiller", value: 16, color: "#ffde59" },
      { name: "À risque", value: 12, color: "#ff5757" },
    ],
    engagedStudents: [
      { name: "Antoine Bergeron", atelier: 10 },
      { name: "Gabriel Morin", atelier: 9 },
      { name: "Thomas Leblanc", atelier: 9 },
    ],
    supportStudents: [
      { name: "Zoé Dupuis", atelier: 5, gap: 3 },
      { name: "Léa Simard", atelier: 6, gap: 2 },
      { name: "Marc Tremblay", atelier: 5, gap: 3 },
    ],
    allStudents: [
      { id: 11, name: "Antoine Bergeron" }, { id: 12, name: "Léa Simard" },
      { id: 13, name: "Gabriel Morin" }, { id: 14, name: "Zoé Dupuis" },
      { id: 15, name: "Thomas Leblanc" }, { id: 16, name: "Marc Tremblay" },
    ],
  },
  "2e année A": {
    numClasses: 1, numStudents: 26,
    goodGrades: 77, satisfactory: 15, failing: 6, notSubmitted: 2,
    workshopRange: [
      { name: "Ateliers Unité 1", value: 26 },
      { name: "Ateliers Unités 2-5", value: 26 },
      { name: "Ateliers Unités 6-10", value: 20 },
    ],
    progressOverTime: [
      { month: "Sept", average: 55 }, { month: "Oct", average: 64 },
      { month: "Nov", average: 70 }, { month: "Déc", average: 74 },
      { month: "Jan", average: 77 }, { month: "Fév", average: 79 },
      { month: "Mar", average: 81 }, { month: "Avr", average: 82 },
      { month: "Mai", average: 83 }, { month: "Juin", average: 85 },
    ],
    onTrack: 20, progressing: 4, needingSupport: 2, threshold: 15,
    distribution: [
      { name: "En voie / Acquis", value: 77, color: "#c9e265" },
      { name: "À surveiller", value: 15, color: "#ffde59" },
      { name: "À risque", value: 8, color: "#ff5757" },
    ],
    engagedStudents: [
      { name: "Sophie Tremblay", atelier: 15 },
      { name: "Jade Martin", atelier: 14 },
      { name: "Maxime Lachance", atelier: 13 },
    ],
    supportStudents: [
      { name: "Camille Rousseau", atelier: 9, gap: 6 },
      { name: "Lucas Fortin", atelier: 10, gap: 5 },
    ],
    allStudents: [
      { id: 16, name: "Sophie Tremblay" }, { id: 17, name: "Lucas Fortin" },
      { id: 18, name: "Jade Martin" }, { id: 19, name: "Maxime Lachance" },
      { id: 20, name: "Camille Rousseau" }, { id: 21, name: "Pierre Gauthier" },
    ],
  },
};

// Grade level expectations per screenshot: 2, 6, 8, 15
const gradeLevelExpectations: {
  labelKey: TranslationKey;
  workshop: number;
  subtitleKey: TranslationKey;
}[] = [
  { labelKey: "student.benchmarkEndK", workshop: 2, subtitleKey: "reports.benchmark.unit1" },
  { labelKey: "student.benchmarkEndPreK", workshop: 6, subtitleKey: "reports.benchmark.unit1" },
  { labelKey: "student.benchmarkEndG1", workshop: 8, subtitleKey: "reports.benchmark.units2to5" },
  { labelKey: "student.benchmarkEndG2", workshop: 15, subtitleKey: "reports.benchmark.allUnits" },
];

const CLASS_OPTIONS = ["Toutes les classes", "Maternelle A", "Jardin", "1re année A", "2e année A"];
const SCHOOL_YEARS = ["2026-2027", "2025-2026", "2024-2025"];

const MONTH_FR_TO_KEY: Record<string, TranslationKey> = {
  Sept: "month.sep",
  Oct: "month.oct",
  Nov: "month.nov",
  Déc: "month.dec",
  Jan: "month.jan",
  Fév: "month.feb",
  Mar: "month.mar",
  Avr: "month.apr",
  Mai: "month.may",
  Juin: "month.jun",
};

const WORKSHOP_RANGE_KEYS: Record<string, TranslationKey> = {
  "Ateliers Unité 1": "reports.workshopsUnit1",
  "Ateliers Unités 2-5": "reports.workshopsUnit2to5",
  "Ateliers Unités 6-10": "reports.workshopsUnit6to10",
};

const DISTRIBUTION_KEYS: Record<string, TranslationKey> = {
  "En voie / Acquis": "reports.onTrackAcquired",
  "À surveiller": "common.monitor",
  "À risque": "common.atRisk",
};

// ─── KPI Card ──────────────────────────────────────────────────────────────

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

// ─── Grade expectation card ─────────────────────────────────────────────────

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
  const { t, a, tp } = useLanguage();
  const [selectedClass, setSelectedClass] = useState("Jardin");
  const [schoolYear, setSchoolYear] = useState("2026-2027");

  const menuItems = [
    { icon: Users, label: t("nav.myClasses"), active: false, path: "/dashboard" },
    { icon: Book, label: t("nav.library"), active: false, path: "/library" },
    { icon: BarChart3, label: t("nav.reports"), active: true, path: "/reports" },
    { icon: User, label: t("nav.profile"), active: false, path: "/profile" },
  ];

  const d = classData[selectedClass] ?? classData["Toutes les classes"];

  const workshopRangeData = d.workshopRange.map((row) => ({
    ...row,
    name: WORKSHOP_RANGE_KEYS[row.name] ? t(WORKSHOP_RANGE_KEYS[row.name]) : a(row.name),
  }));

  const progressData = d.progressOverTime.map((row) => ({
    ...row,
    month: MONTH_FR_TO_KEY[row.month] ? t(MONTH_FR_TO_KEY[row.month]) : a(row.month),
  }));

  const distributionData = d.distribution.map((row) => ({
    ...row,
    name: DISTRIBUTION_KEYS[row.name] ? t(DISTRIBUTION_KEYS[row.name]) : a(row.name),
  }));

  const classOptionLabel = (option: string) =>
    option === "Toutes les classes" ? t("reports.allClasses") : a(option);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-12">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <h1 className="text-xl" style={{ color: "#004aad" }}>Lecture Scientifique</h1>
        </div>
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ background: item.active ? "#dff3ff" : "transparent", color: item.active ? "#004aad" : "#000000" }}>
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <LangToggle />
        <button onClick={() => navigate("/")} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all" style={{ color: "#ff5757" }}>
          <LogOut className="w-5 h-5" />
          <span>{t("common.logout")}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "40px 48px" }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{t("common.reports")}</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>{t("reports.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#38b6ff", color: "#ffffff" }}>MG</div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>{t("common.year")}</p>
            <div className="relative">
              <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl text-sm font-medium appearance-none cursor-pointer outline-none"
                style={{ background: "white", border: "1.5px solid #dff3ff", color: "#004aad" }}>
                {SCHOOL_YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>{t("reports.selectClass")}</p>
            <div className="relative">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl text-sm font-medium appearance-none cursor-pointer outline-none"
                style={{ background: "white", border: "1.5px solid #dff3ff", color: "#004aad" }}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{classOptionLabel(c)}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-6 gap-4 mb-7">
          <KpiCard label={t("reports.numClasses")} value={d.numClasses} icon={BookOpen} iconBg="#dff3ff" iconColor="#004aad" />
          <KpiCard label={t("reports.numStudents")} value={d.numStudents} icon={Users} iconBg="#e0f2fe" iconColor="#0369a1" />
          <KpiCard label={a("Bonnes notes")} value={d.goodGrades} icon={CheckCircle2} iconBg="#ecfdf5" iconColor="#15803d" isPercent />
          <KpiCard label={a("Notes satisfaisantes")} value={d.satisfactory} icon={TrendingUp} iconBg="#fffbeb" iconColor="#b45309" isPercent />
          <KpiCard label={a("Notes insuffisantes")} value={d.failing} icon={AlertCircle} iconBg="#fff1f2" iconColor="#be123c" isPercent />
          <KpiCard label={a("Non soumis")} value={d.notSubmitted} icon={MinusCircle} iconBg="#f8fafc" iconColor="#94a3b8" isPercent />
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-2 gap-6 mb-7">
          {/* Bar chart */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: "#004aad" }}>{t("reports.classPerf")}</h2>
              <button className="p-1.5 rounded-lg" style={{ background: "#dff3ff" }}>
                <Download className="w-4 h-4" style={{ color: "#004aad" }} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workshopRangeData} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#38b6ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line chart */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: "#004aad" }}>{t("reports.progressTime")}</h2>
              <button className="p-1.5 rounded-lg" style={{ background: "#dff3ff" }}>
                <Download className="w-4 h-4" style={{ color: "#004aad" }} />
              </button>
            </div>
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
          </div>
        </div>

        {/* ── Grade Level Expectations ── */}
        <div className="rounded-2xl p-7 mb-7" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: "#004aad" }}>{a("Attentes par niveau scolaire")}</h2>
          <div className="grid grid-cols-4 gap-5">
            {gradeLevelExpectations.map((g) => (
              <GradeCard key={g.labelKey} labelKey={g.labelKey} workshop={g.workshop} subtitleKey={g.subtitleKey} />
            ))}
          </div>
        </div>

        {/* ── Class Performance ── */}
        <div className="rounded-2xl p-7 mb-7" style={{ background: "#ffffff", border: "1.5px solid #dff3ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
          <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
            {t("reports.classPerf")} — {classOptionLabel(selectedClass)}
          </h2>

          <div className="rounded-xl p-5 mb-5 grid grid-cols-3 divide-x" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="text-center px-4">
              <p className="text-3xl font-bold mb-1" style={{ color: "#c9e265" }}>{d.onTrack}</p>
              <p className="text-sm" style={{ color: "#374151" }}>{a(`Élèves sur la bonne voie (≥${d.threshold})`)}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-3xl font-bold mb-1" style={{ color: "#ffde59" }}>{d.progressing}</p>
              <p className="text-sm" style={{ color: "#374151" }}>{a("Élèves en progression")}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-3xl font-bold mb-1" style={{ color: "#ff5757" }}>{d.needingSupport}</p>
              <p className="text-sm" style={{ color: "#374151" }}>{t("reports.needsSupport")}</p>
            </div>
          </div>

          {/* Three sub-cards */}
          <div className="grid grid-cols-3 gap-5">
            {/* Class Distribution */}
            <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
              <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.distribution")}</h3>
              {d.distribution.length > 0 ? (
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
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{a("Aucune donnée disponible")}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
              <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.topStudents")}</h3>
              {d.engagedStudents.length > 0 ? (
                <div className="space-y-3">
                  {d.engagedStudents.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#dff3ff" }}>
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
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{a("Aucune donnée disponible")}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #e8f4ff" }}>
              <h3 className="font-bold mb-4" style={{ color: "#004aad" }}>{t("reports.needsSupport")}</h3>
              {d.supportStudents.length > 0 ? (
                <div className="space-y-3">
                  {d.supportStudents.map((s) => (
                    <div key={s.name} className="p-3 rounded-xl" style={{ background: "#fff1f2" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "#1e293b" }}>{a(s.name)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: "#ff5757", color: "white" }}>
                          {tp("evaluation.workshopN", { n: s.atelier })}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>
                        {a(`${s.gap} atelier${s.gap > 1 ? "s" : ""} en retard sur l'objectif`)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{a("Aucun élève nécessitant un soutien")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Individual Reports ── */}
        <div className="rounded-2xl p-7" style={{ background: "#ffffff", border: "1px solid #e8f4ff", boxShadow: "0 1px 6px rgba(0,74,173,0.06)" }}>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#004aad" }}>{t("reports.individualReports")}</h2>
          <p className="text-sm mb-5" style={{ color: "#6b7280" }}>
            {a("Consultez le rapport détaillé de chaque élève incluant l'historique complet des ateliers et les commentaires")}
          </p>
          <div className="grid grid-cols-4 gap-3">
            {d.allStudents.map((student) => (
              <button key={student.id} onClick={() => navigate(`/student/${student.id}`)}
                className="px-4 py-3 rounded-xl text-left text-sm font-medium transition-all hover:shadow-md"
                style={{ background: "#dff3ff", border: "1px solid #b8e4ff", color: "#004aad" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c5e8ff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dff3ff"; }}>
                {a(student.name)}
              </button>
            ))}
            <button
              className="px-4 py-3 rounded-xl text-left text-sm font-medium transition-all"
              style={{ background: "white", border: "1.5px dashed #b8e4ff", color: "#38b6ff" }}
              onClick={() => navigate("/dashboard")}>
              {t("reports.viewAllStudents")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
