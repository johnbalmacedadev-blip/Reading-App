import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, BarChart3, School, LogOut,
  TrendingUp, CheckCircle2, ChevronDown,
  ArrowUpRight, Users, Building2,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { boardNavItems } from "../i18n/navHelpers";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const schools = [
  { name: "École Laurier-Trudeau",  city: "Ottawa",    students: 312, teachers: 8,  enVoie: 78, aSurveiller: 14, aRisque: 8,  trend: "+4%" },
  { name: "École Saint-Jean",       city: "Orléans",   students: 287, teachers: 7,  enVoie: 83, aSurveiller: 11, aRisque: 6,  trend: "+6%" },
  { name: "École des Pins",         city: "Gloucester", students: 341, teachers: 9,  enVoie: 74, aSurveiller: 17, aRisque: 9,  trend: "+2%" },
  { name: "École Montcalm",         city: "Vanier",    students: 268, teachers: 7,  enVoie: 86, aSurveiller: 9,  aRisque: 5,  trend: "+7%" },
  { name: "École Riverside",        city: "Barrhaven", students: 294, teachers: 8,  enVoie: 80, aSurveiller: 13, aRisque: 7,  trend: "+3%" },
  { name: "École Saint-François",   city: "Kanata",    students: 256, teachers: 6,  enVoie: 71, aSurveiller: 19, aRisque: 10, trend: "+1%" },
  { name: "École La Citadelle",     city: "Cumberland", students: 223, teachers: 6,  enVoie: 76, aSurveiller: 16, aRisque: 8,  trend: "+5%" },
];

const boardTrendData = [
  { monthKey: "month.sep" as const, taux: 55 }, { monthKey: "month.oct" as const, taux: 60 }, { monthKey: "month.nov" as const, taux: 64 },
  { monthKey: "month.dec" as const, taux: 68 }, { monthKey: "month.jan" as const, taux: 72 }, { monthKey: "month.feb" as const, taux: 74 },
  { monthKey: "month.mar" as const, taux: 77 },
];

const gradeData = [
  { gradeKey: "grade.kindergarten" as const, conseil: 88, provincial: 85 },
  { gradeKey: "grade.garden" as const,     conseil: 76, provincial: 73 },
  { gradeKey: "grade.grade1" as const,     conseil: 70, provincial: 68 },
  { gradeKey: "grade.grade2" as const,   conseil: 74, provincial: 71 },
];

export function SchoolBoardDashboard() {
  const navigate = useNavigate();
  const { t, auto: a } = useLanguage();
  const [year, setYear] = useState("2025-2026");

  const menuItems = boardNavItems(t, "overview");

  const trendChartData = boardTrendData.map((d) => ({ month: t(d.monthKey), taux: d.taux }));
  const gradeChartData = gradeData.map((d) => ({ grade: t(d.gradeKey), conseil: d.conseil, provincial: d.provincial }));
  const schoolBarChartData = schools.map(s => ({ name: a(s.name.replace("École ", "")), enVoie: s.enVoie }));

  const totalStudents = schools.reduce((s, c) => s + c.students, 0);
  const totalTeachers = schools.reduce((s, c) => s + c.teachers, 0);
  const avgEnVoie = Math.round(schools.reduce((s, c) => s + c.enVoie, 0) / schools.length);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-10">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>{t("board.portal")}</p>
          </div>
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
              <Building2 className="w-5 h-5" style={{ color: "#004aad" }} />
              <span className="text-sm font-medium" style={{ color: "#004aad" }}>{t("board.boardName")}</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#004aad" }}>{t("common.overview")}</h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>{a("Vue d'ensemble des performances du conseil")}</p>
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
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "#004aad", color: "#fff" }}>CS</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: t("board.participatingSchools"), value: schools.length, icon: School,       bg: "#dff3ff", iconColor: "#004aad" },
            { label: t("board.totalStudents"),        value: totalStudents.toLocaleString("fr-CA"), icon: Users, bg: "#dff3ff", iconColor: "#004aad" },
            { label: t("board.activeTeachers"),       value: totalTeachers, icon: CheckCircle2,  bg: "#c9e265", iconColor: "#1a4a00" },
            { label: t("board.avgOnTrack"),           value: `${avgEnVoie}%`, icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
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
          {/* Board trend */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("board.boardTrend")} (2025–2026)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis domain={[45, 85]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, t("common.onTrack")]} />
                <Line type="monotone" dataKey="taux" stroke="#004aad" strokeWidth={2.5} dot={{ fill: "#004aad", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Grade vs provincial */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("board.vsProvincial")}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gradeChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis domain={[60, 95]} tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                <Tooltip formatter={(v: number, name: string) => [`${v}%`, name === "conseil" ? t("board.ours") : t("board.provincial")]} />
                <Bar dataKey="conseil" fill="#004aad" radius={[4, 4, 0, 0]} name="conseil" />
                <Bar dataKey="provincial" fill="#dff3ff" radius={[4, 4, 0, 0]} name="provincial" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#004aad" }} /><span className="text-xs" style={{ color: "#555" }}>{t("board.ours")}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#dff3ff", border: "1px solid #aaa" }} /><span className="text-xs" style={{ color: "#555" }}>{t("board.provincial")}</span></div>
            </div>
          </div>
        </div>

        {/* School performance bar */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("board.bySchool")}</h2>
          <ResponsiveContainer width="100%" height={160}>
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
        </div>

        {/* Schools table */}
        <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ color: "#004aad" }}>{t("board.schoolDetails")}</h2>
            <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#38b6ff" }}>
              {t("common.export")} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #dff3ff" }}>
                {[t("nav.schools"), t("board.city"), t("nav.students"), t("nav.teachers"), t("common.onTrack"), t("common.monitor"), t("common.atRisk"), t("common.trend")].map(h => (
                  <th key={h} className="pb-3 text-left font-semibold" style={{ color: "#888", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map((s, i) => (
                <tr key={s.name} style={{ borderBottom: i < schools.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                  <td className="py-3 font-semibold text-sm" style={{ color: "#004aad" }}>{a(s.name)}</td>
                  <td className="py-3 text-xs" style={{ color: "#888" }}>{s.city}</td>
                  <td className="py-3 font-medium" style={{ color: "#333" }}>{s.students}</td>
                  <td className="py-3" style={{ color: "#555" }}>{s.teachers}</td>
                  <td className="py-3 font-bold" style={{ color: s.enVoie >= 80 ? "#2e7d32" : s.enVoie >= 70 ? "#d97706" : "#dc2626" }}>{s.enVoie}%</td>
                  <td className="py-3" style={{ color: "#d97706" }}>{s.aSurveiller}%</td>
                  <td className="py-3" style={{ color: s.aRisque >= 9 ? "#dc2626" : "#555" }}>{s.aRisque}%</td>
                  <td className="py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0fff4", color: "#2e7d32" }}>{s.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
