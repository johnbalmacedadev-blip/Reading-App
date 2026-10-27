import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  Plus,
  X,
  Pencil,
  BookOpen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { UserAvatar } from "../components/UserAvatar";
import { TeacherLayout } from "../components/TeacherLayout";
import { TeacherWalkthroughPromo } from "../components/TeacherWalkthroughPromo";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { teacherApi, schoolYearsApi, type ClassSummary, type ClassTypeOption } from "../api/client";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { t, tp, lang } = useLanguage();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showFirstClassNudge, setShowFirstClassNudge] = useState(false);
  const [showClassCreatedNudge, setShowClassCreatedNudge] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [className, setClassName] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [classSchoolYear, setClassSchoolYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [defaultSchoolYear, setDefaultSchoolYear] = useState("");

  useEffect(() => {
    schoolYearsApi.list()
      .then(({ default_label }) => setDefaultSchoolYear(default_label))
      .catch(() => setDefaultSchoolYear("2025-2026"));
  }, []);

  useEffect(() => {
    teacherApi
      .classes()
      .then(({ classes: loadedClasses, class_types }) => {
        setClasses(loadedClasses);
        setClassTypes(class_types);
        if (class_types.length > 0) {
          setClassGrade((prev) => prev || class_types[0].name);
        }
        // Always nudge on dashboard visits until the teacher has at least one class.
        setShowFirstClassNudge(loadedClasses.length === 0);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const dismissFirstClassNudge = () => {
    setShowFirstClassNudge(false);
  };

  const defaultGrade = classTypes[0]?.name ?? "";

  const openAddClassModal = () => {
    setShowFirstClassNudge(false);
    setEditingClass(null);
    setClassName("");
    setClassGrade(defaultGrade);
    setClassSchoolYear(defaultSchoolYear || "2025-2026");
    setShowClassModal(true);
  };

  const handleFirstClassCta = () => {
    dismissFirstClassNudge();
    openAddClassModal();
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
    setClassGrade(defaultGrade);
    setClassSchoolYear(defaultSchoolYear || "2025-2026");
  };

  const handleSaveClass = async () => {
    if (!className.trim()) return;

    const yearDefault = defaultSchoolYear || "2025-2026";
    setSaving(true);
    try {
      const payload = {
        name: className.trim(),
        grade: classGrade,
        school_year: classSchoolYear.trim() || yearDefault,
      };

      if (editingClass) {
        const { class: updatedClass } = await teacherApi.updateClass(editingClass.id, payload);
        setClasses((prev) =>
          prev.map((item) => (item.id === updatedClass.id ? updatedClass : item))
        );
        closeClassModal();
        toast.success(t("dashboard.classUpdated.toast"));
      } else {
        const { class: createdClass } = await teacherApi.createClass(payload);
        setClasses((prev) => [...prev, createdClass]);
        closeClassModal();
        setShowFirstClassNudge(false);
        setShowClassCreatedNudge(true);
        toast.success(t("dashboard.classCreated.toast"));
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editingClass
            ? t("dashboard.classUpdateFailed")
            : t("dashboard.classSaveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classItem: ClassSummary) => {
    if (classItem.student_count > 0) return;

    const confirmed = window.confirm(
      tp("dashboard.deleteClassConfirm", { name: classItem.name }),
    );
    if (!confirmed) return;

    setDeletingId(classItem.id);
    try {
      await teacherApi.deleteClass(classItem.id);
      setClasses((prev) => prev.filter((item) => item.id !== classItem.id));
      toast.success(t("dashboard.classDeleted.toast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.classDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const teacherFirstName = user?.first_name || user?.name?.split(" ")[0] || t("dashboard.defaultTeacher");

  const gradeOptions = (() => {
    const options = classTypes.map((type) => ({
      value: type.name,
      label: lang === "fr" && type.name_fr ? type.name_fr : type.name,
    }));
    if (classGrade && !options.some((option) => option.value === classGrade)) {
      options.unshift({ value: classGrade, label: classGrade });
    }
    return options;
  })();

  const gradeLabel = (grade: string) =>
    gradeOptions.find((option) => option.value === grade)?.label ?? grade;

  return (
    <TeacherLayout activeNav="classes" contentClassName="flex-1 p-12 overflow-y-auto">
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

        <TeacherWalkthroughPromo />

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
                    <div className="flex items-start gap-2">
                      {classItem.student_count === 0 && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteClass(classItem)}
                          disabled={deletingId === classItem.id}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          style={{
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                            color: "#be123c",
                          }}
                          aria-label={t("dashboard.deleteClass")}
                          title={t("dashboard.deleteClass")}
                        >
                          {deletingId === classItem.id ? (
                            <span className="text-xs">…</span>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{ background: "#dff3ff" }}
                      >
                        <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
                      </div>
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

      {showFirstClassNudge && !showClassModal && !showClassCreatedNudge && !loading && classes.length === 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-class-nudge-title"
        >
          <div
            className="w-full max-w-md rounded-2xl p-8 shadow-xl relative"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <button
              type="button"
              onClick={dismissFirstClassNudge}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
              aria-label={t("common.cancel")}
            >
              <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
            </button>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#dff3ff", color: "#004aad" }}
            >
              <Sparkles className="w-7 h-7" />
            </div>
            <h3
              id="first-class-nudge-title"
              className="text-2xl font-bold mb-3"
              style={{ color: "#004aad" }}
            >
              {t("dashboard.firstClass.title")}
            </h3>
            <p className="text-base leading-relaxed mb-7" style={{ color: "#475569" }}>
              {t("dashboard.firstClass.body")}
            </p>
            <button
              type="button"
              onClick={handleFirstClassCta}
              className="w-full py-3.5 rounded-xl font-semibold transition-all"
              style={{ background: "#004aad", color: "#ffffff" }}
            >
              {t("dashboard.firstClass.cta")}
            </button>
          </div>
        </div>
      )}

      {showClassCreatedNudge && !showClassModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-created-nudge-title"
        >
          <div
            className="w-full max-w-md rounded-2xl p-8 shadow-xl relative"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <button
              type="button"
              onClick={() => setShowClassCreatedNudge(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
              aria-label={t("common.cancel")}
            >
              <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
            </button>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#ecfdf5", color: "#059669" }}
            >
              <BookOpen className="w-7 h-7" />
            </div>
            <h3
              id="class-created-nudge-title"
              className="text-2xl font-bold mb-3"
              style={{ color: "#004aad" }}
            >
              {t("dashboard.classCreated.title")}
            </h3>
            <p className="text-base leading-relaxed mb-7" style={{ color: "#475569" }}>
              {t("dashboard.classCreated.body")}
            </p>
            <button
              type="button"
              onClick={() => setShowClassCreatedNudge(false)}
              className="w-full py-3.5 rounded-xl font-semibold transition-all"
              style={{ background: "#004aad", color: "#ffffff" }}
            >
              {t("dashboard.classCreated.cta")}
            </button>
          </div>
        </div>
      )}

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
    </TeacherLayout>
  );
}
