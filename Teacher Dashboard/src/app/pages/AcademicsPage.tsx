import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, Users, School, LogOut, BarChart3, Settings, Filter, X, ChevronDown, UserCircle, GraduationCap, Target, TrendingUp, ArrowUpRight, Search, User, ClipboardList,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

// Mock data
const teachersData = [
  { id: 1, name: "Mme Martineau", grade: "Maternelle", classes: ["Maternelle A"], students: 22, avgAtelier: 2.9, enVoie: 91 },
  { id: 2, name: "M. Gagnon", grade: "Maternelle", classes: ["Maternelle B"], students: 21, avgAtelier: 2.7, enVoie: 86 },
  { id: 3, name: "M. Leblanc", grade: "Jardin", classes: ["Jardin A"], students: 24, avgAtelier: 3.2, enVoie: 79 },
  { id: 4, name: "Mme Boucher", grade: "Jardin", classes: ["Jardin B"], students: 23, avgAtelier: 3.0, enVoie: 74 },
  { id: 5, name: "Mme Pelletier", grade: "1re année", classes: ["1re année A"], students: 25, avgAtelier: 7.2, enVoie: 72 },
  { id: 6, name: "M. Tremblay", grade: "1re année", classes: ["1re année B"], students: 24, avgAtelier: 6.7, enVoie: 67 },
  { id: 7, name: "Mme Gagnon", grade: "2e année", classes: ["2e année A"], students: 26, avgAtelier: 12.0, enVoie: 77 },
  { id: 8, name: "M. Richard", grade: "2e année", classes: ["2e année B"], students: 25, avgAtelier: 10.5, enVoie: 68 },
];

const studentsData = [
  { id: 1, name: "Amélie Dubois", className: "Maternelle A", grade: "Maternelle", teacher: "Mme Martineau", atelier: 3, enVoie: true },
  { id: 2, name: "Hugo Morin", className: "Maternelle A", grade: "Maternelle", teacher: "Mme Martineau", atelier: 1, enVoie: false },
  { id: 3, name: "Sophie Lavoie", className: "Maternelle A", grade: "Maternelle", teacher: "Mme Martineau", atelier: 4, enVoie: true },
  { id: 4, name: "Lucas Bernard", className: "Maternelle B", grade: "Maternelle", teacher: "M. Gagnon", atelier: 4, enVoie: true },
  { id: 5, name: "Emma Côté", className: "Maternelle B", grade: "Maternelle", teacher: "M. Gagnon", atelier: 1, enVoie: false },
  { id: 6, name: "Charlotte Gagnon", className: "Jardin A", grade: "Jardin", teacher: "M. Leblanc", atelier: 4, enVoie: true },
  { id: 7, name: "Mathieu Lapointe", className: "Jardin A", grade: "Jardin", teacher: "M. Leblanc", atelier: 2, enVoie: false },
  { id: 8, name: "Olivia Roy", className: "Jardin A", grade: "Jardin", teacher: "M. Leblanc", atelier: 3, enVoie: true },
  { id: 9, name: "Noah Tremblay", className: "Jardin B", grade: "Jardin", teacher: "Mme Boucher", atelier: 3, enVoie: false },
  { id: 10, name: "Léa Fortin", className: "Jardin B", grade: "Jardin", teacher: "Mme Boucher", atelier: 4, enVoie: true },
  { id: 11, name: "Antoine Bergeron", className: "1re année A", grade: "1re année", teacher: "Mme Pelletier", atelier: 8, enVoie: true },
  { id: 12, name: "Léa Simard", className: "1re année A", grade: "1re année", teacher: "Mme Pelletier", atelier: 6, enVoie: false },
  { id: 13, name: "Gabriel Morin", className: "1re année A", grade: "1re année", teacher: "Mme Pelletier", atelier: 7, enVoie: true },
  { id: 14, name: "Zoé Dupuis", className: "1re année B", grade: "1re année", teacher: "M. Tremblay", atelier: 5, enVoie: false },
  { id: 15, name: "Thomas Leblanc", className: "1re année B", grade: "1re année", teacher: "M. Tremblay", atelier: 8, enVoie: true },
  { id: 16, name: "Sophie Tremblay", className: "2e année A", grade: "2e année", teacher: "Mme Gagnon", atelier: 13, enVoie: true },
  { id: 17, name: "Lucas Fortin", className: "2e année A", grade: "2e année", teacher: "Mme Gagnon", atelier: 10, enVoie: false },
  { id: 18, name: "Jade Martin", className: "2e année A", grade: "2e année", teacher: "Mme Gagnon", atelier: 13, enVoie: true },
  { id: 19, name: "Maxime Lachance", className: "2e année B", grade: "2e année", teacher: "M. Richard", atelier: 12, enVoie: true },
  { id: 20, name: "Camille Rousseau", className: "2e année B", grade: "2e année", teacher: "M. Richard", atelier: 9, enVoie: false },
];

type ViewMode = "students" | "teachers";
type SortField = "name" | "grade" | "atelier" | "enVoie" | "teacher" | "avgAtelier" | "students";
type SortDirection = "asc" | "desc";

interface FilterState {
  grades: string[];
  teachers: string[];
  atelierRange: [number, number];
  enVoieOnly: boolean;
  searchQuery: string;
}

export function AcademicsPage() {
  const navigate = useNavigate();
  const { t, tp, auto } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>("students");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    grades: [],
    teachers: [],
    atelierRange: [1, 14],
    enVoieOnly: false,
    searchQuery: "",
  });

  const menuItems = [
    { icon: BarChart3,     label: "Overview",     active: false, path: "/school/reports" },
    { icon: GraduationCap, label: "Academics",    active: true,  path: "/school/academics" },
    { icon: ClipboardList, label: "Assessments",  active: false, path: "/school/assessments" },
    { icon: User,          label: "Profile",      active: false, path: "/profile?portal=school" },
    { icon: Settings,      label: "Settings",     active: false, path: "/school/settings" },
  ];

  const grades = ["Maternelle", "Jardin", "1re année", "2e année"];
  const gradeLabel = (grade: string) => {
    const map: Record<string, string> = {
      Maternelle: t("grade.kindergarten"),
      Jardin: t("grade.garden"),
      "1re année": t("grade.grade1"),
      "2e année": t("grade.grade2"),
    };
    return map[grade] ?? grade;
  };
  const allTeachers = teachersData.map(t => t.name);

  const getAtelierColor = (atelier: number) => {
    if (atelier <= 4) return "#3b82f6";
    if (atelier === 5) return "#38bdf8";
    if (atelier === 6) return "#22d3ee";
    if (atelier === 7) return "#a3e635";
    if (atelier === 8) return "#fbbf24";
    if (atelier === 9) return "#fb923c";
    if (atelier === 10) return "#fb7185";
    if (atelier === 11) return "#a855f7";
    if (atelier === 12) return "#0ea5e9";
    if (atelier === 13) return "#ef4444";
    return "#004aad";
  };

  // Filter and sort logic
  const filteredAndSortedData = useMemo(() => {
    let data: any[] = viewMode === "students" ? [...studentsData] : [...teachersData];

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(item => item.name.toLowerCase().includes(query));
    }

    // Apply filters
    if (filters.grades.length > 0) {
      data = data.filter(item => filters.grades.includes(item.grade));
    }

    if (viewMode === "students") {
      if (filters.teachers.length > 0) {
        data = data.filter(item => filters.teachers.includes(item.teacher));
      }
      data = data.filter(item =>
        item.atelier >= filters.atelierRange[0] && item.atelier <= filters.atelierRange[1]
      );
      if (filters.enVoieOnly) {
        data = data.filter(item => item.enVoie);
      }
    } else {
      // For teachers, filter by avgAtelier range
      data = data.filter(item =>
        item.avgAtelier >= filters.atelierRange[0] && item.avgAtelier <= filters.atelierRange[1]
      );
    }

    // Apply sorting
    data.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "enVoie" && viewMode === "teachers") {
        // For teachers, sort by enVoie percentage
        aVal = a.enVoie;
        bVal = b.enVoie;
      } else if (sortField === "atelier" && viewMode === "teachers") {
        // For teachers, use avgAtelier
        aVal = a.avgAtelier;
        bVal = b.avgAtelier;
      }

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return data;
  }, [viewMode, filters, sortField, sortDirection]);

  const activeFiltersCount =
    filters.grades.length +
    filters.teachers.length +
    (filters.enVoieOnly ? 1 : 0) +
    (filters.atelierRange[0] !== 1 || filters.atelierRange[1] !== 14 ? 1 : 0) +
    (filters.searchQuery.trim() ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      grades: [],
      teachers: [],
      atelierRange: [1, 14],
      enVoieOnly: false,
      searchQuery: "",
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-10">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "#004aad" }}>Lecture Scientifique</h1>
            <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>{t("school.portal")}</p>
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
              <School className="w-5 h-5" style={{ color: "#004aad" }} />
              <span className="text-sm font-medium" style={{ color: "#004aad" }}>École Laurier-Trudeau</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#004aad" }}>{auto("Academics")}</h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>{auto("Gestion et analyse des élèves et enseignants")}</p>
          </div>
        </div>

        {/* View Toggle & Search */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("students")}
                className="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 font-medium"
                style={{ background: viewMode === "students" ? "#004aad" : "#dff3ff", color: viewMode === "students" ? "#ffffff" : "#004aad" }}
              >
                <Users className="w-4 h-4" />
                {tp("academics.studentsTab", { count: studentsData.length })}
              </button>
              <button
                onClick={() => setViewMode("teachers")}
                className="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 font-medium"
                style={{ background: viewMode === "teachers" ? "#004aad" : "#dff3ff", color: viewMode === "teachers" ? "#ffffff" : "#004aad" }}
              >
                <UserCircle className="w-4 h-4" />
                {tp("academics.teachersTab", { count: teachersData.length })}
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#888" }} />
              <input
                type="text"
                placeholder={viewMode === "students" ? t("academics.searchStudent") : t("academics.searchTeacher")}
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f9fafb", border: "1px solid #dff3ff", color: "#004aad" }}
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters({ ...filters, searchQuery: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ background: "#dff3ff" }}
                >
                  <X className="w-3 h-3" style={{ color: "#004aad" }} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              style={{ background: activeFiltersCount > 0 ? "#38b6ff" : "#dff3ff", color: activeFiltersCount > 0 ? "#ffffff" : "#004aad" }}
            >
              <Filter className="w-4 h-4" />
              {auto("Filtres")} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "#ffffff", border: "2px solid #38b6ff" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: "#004aad" }}>{auto("Filtres avancés")}</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  style={{ background: "#ff5757", color: "#ffffff" }}
                >
                  <X className="w-3 h-3" />
                  {auto("Effacer tout")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Grade Filter */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>{t("academics.schoolGrade")}</label>
                <div className="space-y-2">
                  {grades.map(grade => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.grades.includes(grade)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, grades: [...filters.grades, grade] });
                          } else {
                            setFilters({ ...filters, grades: filters.grades.filter(g => g !== grade) });
                          }
                        }}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: "#004aad" }}
                      />
                      <span className="text-sm" style={{ color: "#333" }}>{gradeLabel(grade)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teacher Filter (students only) */}
              {viewMode === "students" && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>{t("academics.teacher")}</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allTeachers.map(teacher => (
                      <label key={teacher} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.teachers.includes(teacher)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, teachers: [...filters.teachers, teacher] });
                            } else {
                              setFilters({ ...filters, teachers: filters.teachers.filter(t => t !== teacher) });
                            }
                          }}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: "#004aad" }}
                        />
                        <span className="text-sm" style={{ color: "#333" }}>{teacher}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Atelier Range */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>
                  {viewMode === "students" ? t("academics.currentWorkshop") : t("academics.avgWorkshop")}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs" style={{ color: "#888" }}>Min: {filters.atelierRange[0]}</label>
                    <input
                      type="range"
                      min="1"
                      max="14"
                      value={filters.atelierRange[0]}
                      onChange={(e) => setFilters({ ...filters, atelierRange: [parseInt(e.target.value), filters.atelierRange[1]] })}
                      className="w-full"
                      style={{ accentColor: "#004aad" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: "#888" }}>Max: {filters.atelierRange[1]}</label>
                    <input
                      type="range"
                      min="1"
                      max="14"
                      value={filters.atelierRange[1]}
                      onChange={(e) => setFilters({ ...filters, atelierRange: [filters.atelierRange[0], parseInt(e.target.value)] })}
                      className="w-full"
                      style={{ accentColor: "#004aad" }}
                    />
                  </div>
                </div>
              </div>

              {/* En Voie Only (students) */}
              {viewMode === "students" && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>{auto("Statut")}</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.enVoieOnly}
                      onChange={(e) => setFilters({ ...filters, enVoieOnly: e.target.checked })}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: "#004aad" }}
                    />
                    <span className="text-sm" style={{ color: "#333" }}>{t("academics.onTrackOnly")}</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          {/* Table Header */}
          <div className="p-5 border-b" style={{ borderColor: "#dff3ff", background: "#f7ffd6" }}>
            <p className="text-sm font-semibold" style={{ color: "#004aad" }}>
              {auto(`${filteredAndSortedData.length} résultat${filteredAndSortedData.length !== 1 ? "s" : ""}`)}
            </p>
          </div>

          {/* Sort Controls */}
          <div className="p-4 border-b flex gap-2" style={{ borderColor: "#dff3ff", background: "#f9fafb" }}>
            <span className="text-xs font-semibold self-center" style={{ color: "#666" }}>{t("academics.sortBy")}</span>
            {viewMode === "students" ? (
              <>
                <button
                  onClick={() => toggleSort("name")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "name" ? "#004aad" : "#dff3ff", color: sortField === "name" ? "#ffffff" : "#004aad" }}
                >
                  {auto("Nom")} {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("grade")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "grade" ? "#004aad" : "#dff3ff", color: sortField === "grade" ? "#ffffff" : "#004aad" }}
                >
                  {t("common.grade")} {sortField === "grade" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("atelier")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "atelier" ? "#004aad" : "#dff3ff", color: sortField === "atelier" ? "#ffffff" : "#004aad" }}
                >
                  {t("common.atelier")} {sortField === "atelier" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("teacher")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "teacher" ? "#004aad" : "#dff3ff", color: sortField === "teacher" ? "#ffffff" : "#004aad" }}
                >
                  {t("academics.teacher")} {sortField === "teacher" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => toggleSort("name")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "name" ? "#004aad" : "#dff3ff", color: sortField === "name" ? "#ffffff" : "#004aad" }}
                >
                  {auto("Nom")} {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("grade")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "grade" ? "#004aad" : "#dff3ff", color: sortField === "grade" ? "#ffffff" : "#004aad" }}
                >
                  {t("common.grade")} {sortField === "grade" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("students")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "students" ? "#004aad" : "#dff3ff", color: sortField === "students" ? "#ffffff" : "#004aad" }}
                >
                  {t("common.students")} {sortField === "students" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("enVoie")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: sortField === "enVoie" ? "#004aad" : "#dff3ff", color: sortField === "enVoie" ? "#ffffff" : "#004aad" }}
                >
                  {t("academics.onTrackPct")} {sortField === "enVoie" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
              </>
            )}
          </div>

          {/* List */}
          <div className="divide-y" style={{ borderColor: "#dff3ff" }}>
            {filteredAndSortedData.length === 0 ? (
              <div className="p-12 text-center">
                <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "#004aad" }} />
                <p className="font-semibold mb-1" style={{ color: "#004aad" }}>{auto("Aucun résultat")}</p>
                <p className="text-sm" style={{ color: "#666" }}>{auto("Essayez d'ajuster vos filtres")}</p>
              </div>
            ) : viewMode === "students" ? (
              filteredAndSortedData.map((student: any) => (
                <button
                  key={student.id}
                  onClick={() => navigate(`/student/${student.id}`)}
                  className="w-full p-5 flex items-center justify-between hover:bg-opacity-50 transition-all text-left group"
                  style={{ background: "#ffffff" }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#dff3ff", color: "#004aad" }}>
                      {student.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "#004aad" }}>{student.name}</p>
                      <p className="text-xs" style={{ color: "#666" }}>{student.className} • {student.teacher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.grade")}</p>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>
                        {gradeLabel(student.grade)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.atelier")}</p>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: getAtelierColor(student.atelier), color: "#ffffff" }}>
                        A{student.atelier}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{auto("Statut")}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${student.enVoie ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {student.enVoie ? t("common.onTrack") : t("common.atRisk")}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" style={{ color: "#38b6ff" }} />
                  </div>
                </button>
              ))
            ) : (
              filteredAndSortedData.map((teacher: any) => (
                <div
                  key={teacher.id}
                  className="p-5 flex items-center justify-between hover:bg-opacity-50 transition-all"
                  style={{ background: "#ffffff" }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#004aad", color: "#ffffff" }}>
                      {teacher.name.split(" ").map((n: string) => n[0]).filter((_: any, i: number, a: any[]) => i === 0 || i === a.length - 1).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base mb-0.5" style={{ color: "#004aad" }}>{teacher.name}</p>
                      <p className="text-xs" style={{ color: "#666" }}>{teacher.classes.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.grade")}</p>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#dff3ff", color: "#004aad" }}>
                        {gradeLabel(teacher.grade)}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.students")}</p>
                      <p className="text-lg font-bold" style={{ color: "#004aad" }}>{teacher.students}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("academics.avgWorkshop")}</p>
                      <p className="text-lg font-bold" style={{ color: "#38b6ff" }}>{teacher.avgAtelier.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.onTrack")}</p>
                      <p className="text-lg font-bold" style={{ color: teacher.enVoie >= 75 ? "#22c55e" : teacher.enVoie >= 65 ? "#f59e0b" : "#ff5757" }}>
                        {teacher.enVoie}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
