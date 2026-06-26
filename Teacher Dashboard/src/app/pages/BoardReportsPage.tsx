import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, LogOut,
  ChevronDown, TrendingUp, School, Users, Download,
  ArrowUpRight,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { boardNavItems } from "../i18n/navHelpers";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const schools = [
  { id: 1, name: "École Laurier-Trudeau",  city: "Ottawa",    students: 312, enVoie: 78, aSurveiller: 14, aRisque: 8 },
  { id: 2, name: "École Saint-Jean",       city: "Orléans",   students: 287, enVoie: 83, aSurveiller: 11, aRisque: 6 },
  { id: 3, name: "École des Pins",         city: "Gloucester", students: 341, enVoie: 74, aSurveiller: 17, aRisque: 9 },
  { id: 4, name: "École Montcalm",         city: "Vanier",    students: 268, enVoie: 86, aSurveiller: 9,  aRisque: 5 },
  { id: 5, name: "École Riverside",        city: "Barrhaven", students: 294, enVoie: 80, aSurveiller: 13, aRisque: 7 },
  { id: 6, name: "École Saint-François",   city: "Kanata",    students: 256, enVoie: 71, aSurveiller: 19, aRisque: 10 },
  { id: 7, name: "École La Citadelle",     city: "Cumberland", students: 223, enVoie: 76, aSurveiller: 16, aRisque: 8 },
];

const boardTrendData = [
  { monthKey: "month.sep" as const, taux: 55 }, { monthKey: "month.oct" as const, taux: 60 }, { monthKey: "month.nov" as const, taux: 64 },
  { monthKey: "month.dec" as const, taux: 68 }, { monthKey: "month.jan" as const, taux: 72 }, { monthKey: "month.feb" as const, taux: 74 },
  { monthKey: "month.mar" as const, taux: 77 },
];

const gradeBenchmarks = [
  { gradeKey: "grade.kindergarten" as const, target: 2, atelierNum: 2, color: "#3b82f6" },
  { gradeKey: "grade.garden" as const, target: 6, atelierNum: 6, color: "#3b82f6" },
  { gradeKey: "grade.grade1" as const, target: 10, atelierNum: 10, color: "#fbbf24" },
  { gradeKey: "grade.grade2" as const, target: 14, atelierNum: 14, color: "#ef4444" },
];

const mockClassesBySchool: Record<number, Array<{ id: string; name: string; teacher: string; grade: string; students: number; enVoie: number }>> = {
  1: [
    { id: "1a", name: "Maternelle A", teacher: "Mme Martineau", grade: "Maternelle", students: 22, enVoie: 91 },
    { id: "1b", name: "Jardin A", teacher: "M. Leblanc", grade: "Jardin", students: 24, enVoie: 79 },
    { id: "1c", name: "1re année B", teacher: "M. Tremblay", grade: "1re année", students: 24, enVoie: 67 },
  ],
  2: [
    { id: "2a", name: "Maternelle A", teacher: "Mme Bouchard", grade: "Maternelle", students: 21, enVoie: 86 },
    { id: "2b", name: "2e année A", teacher: "Mme Martin", grade: "2e année", students: 26, enVoie: 77 },
  ],
};

const mockStudentsByClass: Record<string, Array<{ id: number; name: string; grade: string; atelier: number; status: string }>> = {
  "1a": [
    { id: 101, name: "Amélie Dubois", grade: "Maternelle", atelier: 3, status: "En voie" },
    { id: 102, name: "Hugo Morin", grade: "Maternelle", atelier: 1, status: "À surveiller" },
  ],
  "1b": [
    { id: 103, name: "Charlotte Gagnon", grade: "Jardin", atelier: 4, status: "En voie" },
    { id: 104, name: "Mathieu Lapointe", grade: "Jardin", atelier: 2, status: "À risque" },
  ],
  "1c": [
    { id: 105, name: "Léa Simard", grade: "1re année", atelier: 6, status: "À surveiller" },
    { id: 106, name: "Antoine Bergeron", grade: "1re année", atelier: 8, status: "En voie" },
  ],
  "2a": [
    { id: 107, name: "Sophie Tremblay", grade: "2e année", atelier: 14, status: "En voie" },
    { id: 108, name: "Lucas Fortin", grade: "2e année", atelier: 10, status: "À surveiller" },
  ],
};

export function BoardReportsPage() {
  const navigate = useNavigate();
  const { t, tp, auto: a } = useLanguage();
  const [year, setYear] = useState("2025-2026");
  const [viewLevel, setViewLevel] = useState<"board" | "school">("board");
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [schoolSubView, setSchoolSubView] = useState<"overview" | "classes" | "students">("overview");
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);

  const menuItems = boardNavItems(t, "reports");

  const trendChartData = boardTrendData.map((d) => ({ month: t(d.monthKey), taux: d.taux }));
  const schoolBarData = schools.map(s => ({ name: a(s.name.replace("École ", "")), enVoie: s.enVoie }));

  const statusLabel = (status: string) => {
    if (status === "En voie") return t("common.onTrack");
    if (status === "À surveiller") return t("common.monitor");
    return t("common.atRisk");
  };

  const totalStudents = schools.reduce((s, c) => s + c.students, 0);
  const avgEnVoie = Math.round(schools.reduce((s, c) => s + c.enVoie, 0) / schools.length);

  const selectedSchoolData = selectedSchool ? schools.find(s => s.id === selectedSchool) : null;
  const classesForSchool = selectedSchool ? (mockClassesBySchool[selectedSchool] || []) : [];
  const studentsForClass = selectedClassForStudents ? (mockStudentsByClass[selectedClassForStudents] || []) : [];

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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#004aad" }}>
              {t("nav.reports")} — {t("board.boardName")}
            </h1>
            <p className="text-base" style={{ color: "#666" }}>
              {a("Analyse détaillée des performances à tous les niveaux")}
            </p>
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
          </div>
        </div>

        {/* View Level Selector */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold" style={{ color: "#004aad" }}>{a("Niveau de visualisation:")}</label>
            <div className="flex gap-2">
              <button onClick={() => { setViewLevel("board"); setSelectedSchool(null); }}
                className="px-4 py-2 rounded-xl text-sm transition-all"
                style={{ background: viewLevel === "board" ? "#004aad" : "#dff3ff", color: viewLevel === "board" ? "#ffffff" : "#004aad" }}>
                {a("Conseil entier")}
              </button>
              <button onClick={() => { setViewLevel("school"); setSchoolSubView("overview"); }}
                className="px-4 py-2 rounded-xl text-sm transition-all"
                style={{ background: viewLevel === "school" ? "#004aad" : "#dff3ff", color: viewLevel === "school" ? "#ffffff" : "#004aad" }}>
                {a("Par école")}
              </button>
            </div>
          </div>

          {viewLevel === "school" && (
            <div className="mt-4">
              <label className="text-sm font-semibold mb-2 block" style={{ color: "#004aad" }}>{a("Sélectionner une école:")}</label>
              <div className="relative">
                <select value={selectedSchool || ""} onChange={e => { setSelectedSchool(parseInt(e.target.value)); setSchoolSubView("overview"); }}
                  className="w-full px-4 py-2.5 rounded-xl appearance-none pr-9 text-sm"
                  style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}>
                  <option value="">{a("-- Choisir une école --")}</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{a(s.name)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
              </div>
            </div>
          )}
        </div>

        {/* Board-wide View */}
        {viewLevel === "board" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: t("board.participatingSchools"), value: schools.length, icon: School, bg: "#dff3ff", iconColor: "#004aad" },
                { label: t("board.totalStudents"), value: totalStudents.toLocaleString("fr-CA"), icon: Users, bg: "#dff3ff", iconColor: "#004aad" },
                { label: t("board.avgOnTrack"), value: `${avgEnVoie}%`, icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
                { label: t("board.boardTrend"), value: "77%", icon: TrendingUp, bg: "#c9e265", iconColor: "#1a4a00" },
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

              {/* Grade Benchmarks */}
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <h2 className="font-bold text-base mb-5" style={{ color: "#004aad" }}>{t("school.gradeBenchmarks")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {gradeBenchmarks.map(({ gradeKey, target, atelierNum, color }) => (
                    <div key={gradeKey} className="p-4 rounded-xl text-center" style={{ background: "#f7ffd6", border: `2px solid ${color}` }}>
                      <p className="text-xs mb-2" style={{ color: "#666" }}>{a(`Fin de ${t(gradeKey).toLowerCase()}`)}</p>
                      <p className="text-3xl font-bold mb-1" style={{ color: "#004aad" }}>{target}</p>
                      <p className="text-xs" style={{ color: "#666" }}>{tp("evaluation.workshopN", { n: atelierNum })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* School performance bar */}
            <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base" style={{ color: "#004aad" }}>{t("board.bySchool")}</h2>
                <button className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm" style={{ background: "#38b6ff", color: "#ffffff" }}>
                  <Download className="w-4 h-4" />
                  {t("common.export")}
                </button>
              </div>
              <ResponsiveContainer width="100%" height={160}>
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
            </div>
          </>
        )}

        {/* School-specific View */}
        {viewLevel === "school" && selectedSchoolData && (
          <>
            {/* School Header */}
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
                  { label: t("common.onTrack"), value: `${selectedSchoolData.enVoie}%`, bg: "#c9e265" },
                  { label: t("common.monitor"), value: `${selectedSchoolData.aSurveiller}%`, bg: "#ffde59" },
                  { label: t("common.atRisk"), value: `${selectedSchoolData.aRisque}%`, bg: "#ff5757" },
                ].map(({ label, value, bg }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: bg }}>
                    <p className="text-xs mb-1" style={{ color: "#000" }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color: "#004aad" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-view tabs */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
              <div className="flex gap-2">
                <button onClick={() => setSchoolSubView("overview")}
                  className="px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: schoolSubView === "overview" ? "#004aad" : "#dff3ff", color: schoolSubView === "overview" ? "#ffffff" : "#004aad" }}>
                  {t("common.overview")}
                </button>
                <button onClick={() => setSchoolSubView("classes")}
                  className="px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: schoolSubView === "classes" ? "#004aad" : "#dff3ff", color: schoolSubView === "classes" ? "#ffffff" : "#004aad" }}>
                  {t("common.classes")} ({classesForSchool.length})
                </button>
                <button onClick={() => { setSchoolSubView("students"); setSelectedClassForStudents(null); }}
                  className="px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: schoolSubView === "students" ? "#004aad" : "#dff3ff", color: schoolSubView === "students" ? "#ffffff" : "#004aad" }}>
                  {t("common.students")}
                </button>
              </div>
            </div>

            {/* Overview content */}
            {schoolSubView === "overview" && (
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <h3 className="font-bold text-base mb-4" style={{ color: "#004aad" }}>{a("Aperçu de l'école")}</h3>
                <p className="text-sm" style={{ color: "#666" }}>
                  {a(`Vue d'ensemble des performances de ${selectedSchoolData.name}. Utilisez les onglets ci-dessus pour explorer les classes et les élèves.`)}
                </p>
              </div>
            )}

            {/* Classes content */}
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
                            <p className="font-semibold text-lg" style={{ color: cls.enVoie >= 75 ? "#2e7d32" : cls.enVoie >= 65 ? "#d97706" : "#dc2626" }}>{cls.enVoie}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Students content */}
            {schoolSubView === "students" && (
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-base" style={{ color: "#004aad" }}>{a(`Élèves de ${selectedSchoolData.name}`)}</h3>
                  {classesForSchool.length > 0 && (
                    <div className="relative" style={{ minWidth: "200px" }}>
                      <select value={selectedClassForStudents || ""} onChange={e => setSelectedClassForStudents(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl appearance-none pr-9 text-sm"
                        style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}>
                        <option value="">{t("reports.allClasses")}</option>
                        {classesForSchool.map(c => (
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
                      <button
                        key={student.id}
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="w-full p-4 rounded-xl flex items-center justify-between text-left hover:shadow-md transition-all"
                        style={{ background: "#f7ffd6", border: "1px solid #c9e265" }}
                      >
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#004aad" }}>{a(student.name)}</p>
                          <p className="text-xs" style={{ color: "#666" }}>{a(student.grade)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>
                            {tp("evaluation.workshopN", { n: student.atelier })}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            student.status === "En voie" ? "bg-green-100 text-green-800" :
                            student.status === "À surveiller" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {statusLabel(student.status)}
                          </span>
                          <ArrowUpRight className="w-4 h-4" style={{ color: "#38b6ff" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
