import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookOpen,
  BarChart3,
  User,
  LogOut,
  Users,
  Plus,
  X,
  Book,
  Pencil,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { UserAvatar } from "../components/UserAvatar";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { teacherApi, type ClassSummary } from "../api/client";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { t, tp } = useLanguage();
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [className, setClassName] = useState("");
  const [classGrade, setClassGrade] = useState("Maternelle");
  const [classSchoolYear, setClassSchoolYear] = useState("2025-2026");
  const [saving, setSaving] = useState(false);

  const defaultSchoolYear = "2025-2026";

  useEffect(() => {
    teacherApi
      .classes()
      .then(({ classes: loadedClasses }) => setClasses(loadedClasses))
      .finally(() => setLoading(false));
  }, []);

  const menuItems = [
    { icon: Users, label: t("nav.myClasses"), active: true, path: "/dashboard" },
    { icon: Book, label: t("nav.library"), active: false, path: "/library" },
    { icon: BarChart3, label: t("nav.reports"), active: false, path: "/reports" },
    { icon: User, label: t("nav.profile"), active: false, path: "/profile" },
  ];

  const openAddClassModal = () => {
    setEditingClass(null);
    setClassName("");
    setClassGrade("Maternelle");
    setClassSchoolYear(defaultSchoolYear);
    setShowClassModal(true);
  };

  const openEditClassModal = (classItem: ClassSummary) => {
    setEditingClass(classItem);
    setClassName(classItem.name);
    setClassGrade(classItem.grade);
    setClassSchoolYear(classItem.school_year || defaultSchoolYear);
    setShowClassModal(true);
  };

  const closeClassModal = () => {
    setShowClassModal(false);
    setEditingClass(null);
    setClassName("");
    setClassGrade("Maternelle");
    setClassSchoolYear(defaultSchoolYear);
  };

  const handleSaveClass = async () => {
    if (!className.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: className.trim(),
        grade: classGrade,
        school_year: classSchoolYear.trim() || defaultSchoolYear,
      };

      if (editingClass) {
        const { class: updatedClass } = await teacherApi.updateClass(editingClass.id, payload);
        setClasses((prev) =>
          prev.map((item) => (item.id === updatedClass.id ? updatedClass : item))
        );
      } else {
        const { class: createdClass } = await teacherApi.createClass(payload);
        setClasses((prev) => [...prev, createdClass]);
      }

      closeClassModal();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const teacherFirstName = user?.first_name || user?.name?.split(" ")[0] || t("dashboard.defaultTeacher");

  const gradeOptions = [
    { value: "Maternelle", label: t("grade.kindergarten") },
    { value: "1re année", label: t("grade.grade1") },
    { value: "2e année", label: t("grade.grade2") },
  ];

  const gradeLabel = (grade: string) =>
    gradeOptions.find((option) => option.value === grade)?.label ?? grade;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div
        className="w-64 p-6 flex flex-col overflow-y-auto"
        style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}
      >
        <div className="flex items-center gap-3 mb-12">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-xl" style={{ color: "#004aad" }}>
              {t("common.appName")}
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  background: item.active ? "#dff3ff" : "transparent",
                  color: item.active ? "#004aad" : "#000000",
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <LangToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{ color: "#ff5757" }}
        >
          <LogOut className="w-5 h-5" />
          <span>{t("common.logout")}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-12 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {t("dashboard.greeting")}, {teacherFirstName}!
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <UserAvatar />
          </div>
        </div>

        {/* Class Card */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl" style={{ color: "#004aad" }}>
              {classes.length > 1 ? t("dashboard.myClasses") : t("dashboard.myClass")}
            </h2>
            <button
              onClick={openAddClassModal}
              className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
              style={{
                background: "#004aad",
                color: "#ffffff",
              }}
            >
              <Plus className="w-5 h-5" />
              {t("dashboard.addClass")}
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#004aad" }}>{t("dashboard.loadingClasses")}</p>
          ) : classes.length === 0 ? (
            <div
              className="rounded-2xl p-8 shadow-lg max-w-md"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <p style={{ color: "#000000" }}>
                {t("dashboard.noClasses")}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="rounded-2xl p-8 shadow-lg"
                  style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl mb-2" style={{ color: "#004aad" }}>
                        {classItem.name}
                      </h3>
                      <p className="text-sm mb-2" style={{ color: "#666" }}>
                        {gradeLabel(classItem.grade)}
                      </p>
                      <p className="text-sm mb-2" style={{ color: "#666" }}>
                        {classItem.school_year}
                      </p>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" style={{ color: "#38b6ff" }} />
                        <span className="text-lg" style={{ color: "#000000" }}>
                          {tp("common.studentCount", { count: classItem.student_count })}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ background: "#dff3ff" }}
                    >
                      <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => openEditClassModal(classItem)}
                      className="flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #dff3ff",
                        color: "#004aad",
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => navigate(`/class/${classItem.id}`)}
                      className="flex-1 py-3 rounded-xl transition-all cursor-pointer"
                      style={{
                        background: "#004aad",
                        color: "#ffffff",
                      }}
                    >
                      {t("dashboard.viewClass")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            style={{ background: "#ffffff" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl" style={{ color: "#004aad" }}>
                {editingClass ? t("dashboard.editClass") : t("dashboard.addClass")}
              </h2>
              <button
                onClick={closeClassModal}
                className="p-2 rounded-xl transition-all cursor-pointer"
                style={{ background: "#dff3ff" }}
              >
                <X className="w-5 h-5" style={{ color: "#004aad" }} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: "#000000" }}>
                  {t("dashboard.className")}
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{
                    background: "#dff3ff",
                    borderColor: "#38b6ff",
                  }}
                  placeholder={t("dashboard.classNamePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: "#000000" }}>
                  {t("common.grade")}
                </label>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{
                    background: "#dff3ff",
                    borderColor: "#38b6ff",
                    color: "#000000",
                  }}
                >
                  {gradeOptions.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: "#000000" }}>
                  {t("dashboard.schoolYear")}
                </label>
                <input
                  type="text"
                  value={classSchoolYear}
                  onChange={(e) => setClassSchoolYear(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{
                    background: "#dff3ff",
                    borderColor: "#38b6ff",
                  }}
                  placeholder={t("dashboard.schoolYearPlaceholder")}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={closeClassModal}
                  className="flex-1 py-3 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dff3ff",
                    color: "#000000",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSaveClass}
                  disabled={saving || !className.trim()}
                  className="flex-1 py-3 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: saving || !className.trim() ? "#64748b" : "#004aad",
                    color: "#ffffff",
                  }}
                >
                  {saving
                    ? t("common.creating")
                    : editingClass
                      ? t("common.save")
                      : t("dashboard.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
