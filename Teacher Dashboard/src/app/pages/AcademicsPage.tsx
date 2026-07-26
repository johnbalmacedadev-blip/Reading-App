import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen, Users, School, LogOut, BarChart3, Settings, Filter, X, UserCircle, GraduationCap,
  ArrowUpRight, Search, User, ClipboardList, Loader2, ChevronDown, UserPlus,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { usePortalLogout } from "../hooks/usePortalLogout";
import {
  schoolAcademicsApi,
  type SchoolAcademicsStudent,
  type SchoolAcademicsTeacher,
} from "../api/client";

type ViewMode = "students" | "teachers";
type StudentSortField = "name" | "grade" | "atelier" | "en_voie" | "teacher";
type TeacherSortField = "name" | "grade" | "students" | "en_voie" | "avg_atelier";
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
  const handleLogout = usePortalLogout();

  const [studentsData, setStudentsData] = useState<SchoolAcademicsStudent[]>([]);
  const [teachersData, setTeachersData] = useState<SchoolAcademicsTeacher[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolBoardName, setSchoolBoardName] = useState<string | null>(null);
  const [grades, setGrades] = useState<string[]>([]);
  const [year, setYear] = useState("");
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("students");
  const [studentSortField, setStudentSortField] = useState<StudentSortField>("name");
  const [teacherSortField, setTeacherSortField] = useState<TeacherSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    grades: [],
    teachers: [],
    atelierRange: [1, 14],
    enVoieOnly: false,
    searchQuery: "",
  });

  const loadAcademics = useCallback(async (schoolYear?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await schoolAcademicsApi.get(schoolYear);
      setStudentsData(data.students);
      setTeachersData(data.teachers);
      setSchoolName(data.school.name);
      setSchoolBoardName(data.school.school_board?.name ?? null);
      setGrades(data.grades);
      setYearOptions(data.available_years);
      if (!schoolYear && data.school_year) {
        setYear(data.school_year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load academics.");
      setStudentsData([]);
      setTeachersData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademics();
  }, [loadAcademics]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    loadAcademics(newYear);
  };

  const menuItems = [
    { icon: BarChart3, label: "Overview", active: false, path: "/school/reports" },
    { icon: GraduationCap, label: "Academics", active: true, path: "/school/academics" },
    { icon: ClipboardList, label: "Assessments", active: false, path: "/school/assessments" },
    { icon: UserPlus, label: t("nav.teacherRequests"), active: false, path: "/school/teachers" },
    { icon: User, label: "Profile", active: false, path: "/profile?portal=school" },
    { icon: Settings, label: "Settings", active: false, path: "/school/settings" },
  ];

  const gradeLabel = (grade: string) => {
    const map: Record<string, string> = {
      Maternelle: t("grade.kindergarten"),
      Jardin: t("grade.garden"),
      "1re année": t("grade.grade1"),
      "2e année": t("grade.grade2"),
      "3e année": t("grade.grade3"),
    };
    return map[grade] ?? grade;
  };

  const allTeachers = teachersData.map((teacher) => teacher.name);

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

  const filteredStudents = useMemo(() => {
    let data = [...studentsData];

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter((item) => item.name.toLowerCase().includes(query));
    }

    if (filters.grades.length > 0) {
      data = data.filter((item) => filters.grades.includes(item.grade));
    }

    if (filters.teachers.length > 0) {
      data = data.filter((item) => filters.teachers.includes(item.teacher));
    }

    data = data.filter(
      (item) => item.atelier >= filters.atelierRange[0] && item.atelier <= filters.atelierRange[1]
    );

    if (filters.enVoieOnly) {
      data = data.filter((item) => item.en_voie);
    }

    data.sort((a, b) => {
      const aVal = a[studentSortField];
      const bVal = b[studentSortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortDirection === "asc"
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return data;
  }, [studentsData, filters, studentSortField, sortDirection]);

  const filteredTeachers = useMemo(() => {
    let data = [...teachersData];

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter((item) => item.name.toLowerCase().includes(query));
    }

    if (filters.grades.length > 0) {
      data = data.filter((item) => filters.grades.includes(item.grade));
    }

    data = data.filter(
      (item) => item.avg_atelier >= filters.atelierRange[0] && item.avg_atelier <= filters.atelierRange[1]
    );

    data.sort((a, b) => {
      const aVal = a[teacherSortField];
      const bVal = b[teacherSortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return data;
  }, [teachersData, filters, teacherSortField, sortDirection]);

  const filteredAndSortedData = viewMode === "students" ? filteredStudents : filteredTeachers;

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

  const toggleStudentSort = (field: StudentSortField) => {
    if (studentSortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setStudentSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleTeacherSort = (field: TeacherSortField) => {
    if (teacherSortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setTeacherSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
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
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm" style={{ color: "#ff5757" }}>
          <LogOut className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <School className="w-5 h-5" style={{ color: "#004aad" }} />
              <span className="text-sm font-medium" style={{ color: "#004aad" }}>{schoolName || "—"}</span>
            </div>
            {schoolBoardName && (
              <p className="text-xs mb-1" style={{ color: "#64748b", marginLeft: 28 }}>{auto(schoolBoardName)}</p>
            )}
            <h1 className="text-3xl font-bold" style={{ color: "#004aad" }}>{auto("Academics")}</h1>
            <p className="text-sm mt-1" style={{ color: "#666" }}>{auto("Gestion et analyse des élèves et enseignants")}</p>
          </div>

          {yearOptions.length > 0 && (
            <div className="relative">
              <select
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-4 py-2.5 pr-9 rounded-xl text-sm font-medium appearance-none cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#004aad" }} />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: "#fff1f2", color: "#be123c" }}>
            {error}
          </div>
        )}

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
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>{t("academics.schoolGrade")}</label>
                <div className="space-y-2">
                  {grades.map((grade) => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.grades.includes(grade)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, grades: [...filters.grades, grade] });
                          } else {
                            setFilters({ ...filters, grades: filters.grades.filter((g) => g !== grade) });
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

              {viewMode === "students" && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#666" }}>{t("academics.teacher")}</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allTeachers.map((teacher) => (
                      <label key={teacher} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.teachers.includes(teacher)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, teachers: [...filters.teachers, teacher] });
                            } else {
                              setFilters({ ...filters, teachers: filters.teachers.filter((t) => t !== teacher) });
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

        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
          <div className="p-5 border-b" style={{ borderColor: "#dff3ff", background: "#f7ffd6" }}>
            <p className="text-sm font-semibold" style={{ color: "#004aad" }}>
              {loading
                ? t("common.loading")
                : auto(`${filteredAndSortedData.length} résultat${filteredAndSortedData.length !== 1 ? "s" : ""}`)}
            </p>
          </div>

          <div className="p-4 border-b flex gap-2" style={{ borderColor: "#dff3ff", background: "#f9fafb" }}>
            <span className="text-xs font-semibold self-center" style={{ color: "#666" }}>{t("academics.sortBy")}</span>
            {viewMode === "students" ? (
              <>
                {([
                  ["name", auto("Nom")],
                  ["grade", t("common.grade")],
                  ["atelier", t("common.atelier")],
                  ["teacher", t("academics.teacher")],
                ] as const).map(([field, label]) => (
                  <button
                    key={field}
                    onClick={() => toggleStudentSort(field)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: studentSortField === field ? "#004aad" : "#dff3ff", color: studentSortField === field ? "#ffffff" : "#004aad" }}
                  >
                    {label} {studentSortField === field && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                ))}
              </>
            ) : (
              <>
                {([
                  ["name", auto("Nom")],
                  ["grade", t("common.grade")],
                  ["students", t("common.students")],
                  ["en_voie", t("academics.onTrackPct")],
                ] as const).map(([field, label]) => (
                  <button
                    key={field}
                    onClick={() => toggleTeacherSort(field)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: teacherSortField === field ? "#004aad" : "#dff3ff", color: teacherSortField === field ? "#ffffff" : "#004aad" }}
                  >
                    {label} {teacherSortField === field && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: "#dff3ff" }}>
            {loading ? (
              <div className="p-12 flex justify-center items-center gap-2" style={{ color: "#64748b" }}>
                <Loader2 className="animate-spin w-6 h-6" />
                {t("common.loading")}
              </div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="p-12 text-center">
                <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "#004aad" }} />
                <p className="font-semibold mb-1" style={{ color: "#004aad" }}>{auto("Aucun résultat")}</p>
                <p className="text-sm" style={{ color: "#666" }}>{auto("Essayez d'ajuster vos filtres")}</p>
              </div>
            ) : viewMode === "students" ? (
              (filteredAndSortedData as SchoolAcademicsStudent[]).map((student) => (
                <button
                  key={student.id}
                  onClick={() => navigate(`/student/${student.id}`)}
                  className="w-full p-5 flex items-center justify-between hover:bg-opacity-50 transition-all text-left group"
                  style={{ background: "#ffffff" }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#dff3ff", color: "#004aad" }}>
                      {student.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "#004aad" }}>{student.name}</p>
                      <p className="text-xs" style={{ color: "#666" }}>{student.class_name} • {student.teacher}</p>
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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${student.en_voie ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {student.en_voie ? t("common.onTrack") : t("common.atRisk")}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" style={{ color: "#38b6ff" }} />
                  </div>
                </button>
              ))
            ) : (
              (filteredAndSortedData as SchoolAcademicsTeacher[]).map((teacher) => (
                <div
                  key={teacher.id}
                  className="p-5 flex items-center justify-between hover:bg-opacity-50 transition-all"
                  style={{ background: "#ffffff" }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#004aad", color: "#ffffff" }}>
                      {teacher.name.split(" ").map((n) => n[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join("").toUpperCase()}
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
                      <p className="text-lg font-bold" style={{ color: "#38b6ff" }}>{teacher.avg_atelier.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "#888" }}>{t("common.onTrack")}</p>
                      <p className="text-lg font-bold" style={{ color: teacher.en_voie >= 75 ? "#22c55e" : teacher.en_voie >= 65 ? "#f59e0b" : "#ff5757" }}>
                        {teacher.en_voie}%
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
