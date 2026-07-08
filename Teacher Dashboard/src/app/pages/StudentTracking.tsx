import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, Download, Plus, X, Info } from "lucide-react";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";
import { teacherApi, type ClassStudent, type EvaluationStatus } from "../api/client";

interface Student {
  id: number;
  name: string;
  evaluations: EvaluationStatus[];
}

type AtelierKey =
  | "tracking.atelier1"
  | "tracking.atelier2"
  | "tracking.atelier3"
  | "tracking.atelier4"
  | "tracking.atelier5"
  | "tracking.atelier6"
  | "tracking.atelier7"
  | "tracking.atelier8"
  | "tracking.atelier9"
  | "tracking.atelier10"
  | "tracking.atelier11"
  | "tracking.atelier12"
  | "tracking.atelier13"
  | "tracking.atelier14"
  | "tracking.atelier15";

const ATELIER_KEYS: AtelierKey[] = [
  "tracking.atelier1",
  "tracking.atelier2",
  "tracking.atelier3",
  "tracking.atelier4",
  "tracking.atelier5",
  "tracking.atelier6",
  "tracking.atelier7",
  "tracking.atelier8",
  "tracking.atelier9",
  "tracking.atelier10",
  "tracking.atelier11",
  "tracking.atelier12",
  "tracking.atelier13",
  "tracking.atelier14",
  "tracking.atelier15",
];

export function StudentTracking() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { t, tp } = useLanguage();
  const [className, setClassName] = useState("");
  const [classSchoolYear, setClassSchoolYear] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentFirstName, setNewStudentFirstName] = useState("");
  const [newStudentLastName, setNewStudentLastName] = useState("");
  const [hoveredEvaluation, setHoveredEvaluation] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classId) return;

    teacherApi
      .classDetail(classId)
      .then(({ class: classData }) => {
        setClassName(classData.name);
        setClassSchoolYear(classData.school_year ?? "");
        setStudents(
          classData.students.map((student: ClassStudent) => ({
            id: student.id,
            name: student.name,
            evaluations: student.evaluations,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const getStatusColor = (status: EvaluationStatus) => {
    if (status === "success") return "#c9e265";
    if (status === "adequate") return "#ffde59";
    if (status === "needs-improvement") return "#ff5757";
    if (status === "not-required") return "#b8a3d6";
    return "#d1d5db";
  };

  const getStatusText = (status: EvaluationStatus) => {
    if (status === "success") return "✓";
    if (status === "adequate") return "~";
    if (status === "needs-improvement") return "!";
    if (status === "not-required") return "—";
    return "";
  };

  const handleEvaluationClick = (studentId: number, evaluationNum: number) => {
    const student = students.find((s) => s.id === studentId);
    const context = {
      studentName: student?.name ?? "",
      classId: Number(classId),
      schoolYear: classSchoolYear,
    };
    sessionStorage.setItem(`eval-context-${studentId}`, JSON.stringify(context));
    navigate(`/evaluation/${studentId}/${evaluationNum}`, { state: context });
  };

  const handleAddStudent = async () => {
    if (!classId || !newStudentFirstName.trim() || !newStudentLastName.trim()) return;

    setSaving(true);
    try {
      const { student } = await teacherApi.addStudent(classId, {
        first_name: newStudentFirstName.trim(),
        last_name: newStudentLastName.trim(),
      });
      setStudents((prev) => [
        ...prev,
        {
          id: student.id,
          name: student.name,
          evaluations: student.evaluations,
        },
      ]);
      setShowAddStudentModal(false);
      setNewStudentFirstName("");
      setNewStudentLastName("");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("tracking.loadingClass")}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Header */}
      <div
        className="p-6 border-b flex-shrink-0"
        style={{ background: "#ffffff", borderColor: "#dff3ff" }}
      >
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 mb-4 text-sm"
            style={{ color: "#38b6ff" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("tracking.backToClasses")}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div
                className="inline-block px-4 py-2 rounded-lg mb-3"
                style={{ background: "#004aad", color: "#ffffff" }}
              >
                <p className="text-sm">{t("tracking.smlSystem")}</p>
              </div>
              <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
                {className}
              </h1>
              <p className="text-lg" style={{ color: "#000000" }}>
                {tp("common.studentCount", { count: students.length })}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <LangToggle className="" />
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
                style={{
                  background: "#38b6ff",
                  color: "#ffffff",
                }}
              >
                <Plus className="w-5 h-5" />
                {t("tracking.addStudent")}
              </button>
              <button
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
                style={{
                  background: "#004aad",
                  color: "#ffffff",
                }}
              >
                <FileText className="w-5 h-5" />
                {t("eval.saveAtelier")}
              </button>
              <button
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
                style={{
                  background: "#ffffff",
                  border: "1px solid #dff3ff",
                  color: "#004aad",
                }}
              >
                <Download className="w-5 h-5" />
                {t("common.export")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{ background: "#ffffff" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {/* Unit Headers */}
                  <tr>
                    <th
                      className="px-6 py-3 text-left sticky left-0"
                      style={{ background: "#dff3ff" }}
                    ></th>
                    {Array.from({ length: 10 }, (_, i) => {
                      const unitSpans = [6, 1, 1, 1, 1, 1, 1, 1, 1, 1];
                      const colors = [
                        { bg: "#3b82f6", color: "#ffffff" },
                        { bg: "#38bdf8", color: "#000000" },
                        { bg: "#22d3ee", color: "#000000" },
                        { bg: "#a3e635", color: "#000000" },
                        { bg: "#fbbf24", color: "#000000" },
                        { bg: "#fb923c", color: "#000000" },
                        { bg: "#fb7185", color: "#000000" },
                        { bg: "#a855f7", color: "#ffffff" },
                        { bg: "#0ea5e9", color: "#ffffff" },
                        { bg: "#ef4444", color: "#ffffff" },
                      ];
                      return (
                        <th
                          key={i + 1}
                          colSpan={unitSpans[i]}
                          className={`px-2 py-3 text-center text-xs ${i < 9 ? "border-r" : ""}`}
                          style={{
                            background: colors[i].bg,
                            color: colors[i].color,
                            borderColor: "#ffffff",
                          }}
                        >
                          {tp("tracking.unit", { n: i + 1 })}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Atelier Number Headers */}
                  <tr style={{ background: "#dff3ff" }}>
                    <th
                      className="px-6 py-4 text-left sticky left-0"
                      style={{ background: "#dff3ff", color: "#004aad" }}
                    >
                      {t("tracking.student")}
                    </th>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
                      <th
                        key={num}
                        className="px-4 py-4 text-center relative group"
                        style={{
                          color: "#004aad",
                          minWidth: "60px",
                          borderRight: [6, 7, 8, 9, 10, 11, 12, 13, 14].includes(num) ? "1px solid #ffffff" : "none"
                        }}
                        onMouseEnter={() => setHoveredEvaluation(num)}
                        onMouseLeave={() => setHoveredEvaluation(null)}
                      >
                        {num}
                        {hoveredEvaluation === num && (
                          <div
                            className="absolute z-50 p-3 rounded-xl shadow-2xl text-left whitespace-normal"
                            style={{
                              background: "#004aad",
                              color: "#ffffff",
                              top: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: "250px",
                              marginTop: "8px",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{t(ATELIER_KEYS[num - 1])}</span>
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr
                      key={student.id}
                      className="border-t"
                      style={{ borderColor: "#dff3ff" }}
                    >
                      <td
                        className="px-6 py-4 sticky left-0"
                        style={{
                          background: idx % 2 === 0 ? "#ffffff" : "#dff3ff",
                          color: "#000000",
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate(`/student/${student.id}`, {
                              state: { classId: Number(classId) },
                            })
                          }
                          className="hover:underline text-left"
                          style={{ color: "#38b6ff" }}
                        >
                          {student.name}
                        </button>
                      </td>
                      {student.evaluations.map((status, evalIdx) => (
                        <td
                          key={evalIdx}
                          className="px-4 py-4 text-center"
                          style={{
                            background: idx % 2 === 0 ? "#ffffff" : "#dff3ff",
                            borderRight: [5, 6, 7, 8, 9, 10, 11, 12, 13].includes(evalIdx) ? "1px solid #ffffff" : "none"
                          }}
                        >
                          <button
                            onClick={() => handleEvaluationClick(student.id, evalIdx + 1)}
                            className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto transition-all hover:opacity-80 cursor-pointer"
                            style={{
                              background: getStatusColor(status),
                              color: status === "success" ? "#000000" : "#ffffff",
                            }}
                          >
                            {getStatusText(status)}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ background: "#c9e265" }}
              ></div>
              <span style={{ color: "#000000" }}>{t("common.onTrack")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ background: "#ffde59" }}
              ></div>
              <span style={{ color: "#000000" }}>{t("common.monitor")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ background: "#ff5757" }}
              ></div>
              <span style={{ color: "#000000" }}>{t("common.atRisk")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ background: "#b8a3d6" }}
              ></div>
              <span style={{ color: "#000000" }}>{t("common.notRequired")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ background: "#d1d5db" }}
              ></div>
              <span style={{ color: "#000000" }}>—</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            style={{ background: "#ffffff" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl" style={{ color: "#004aad" }}>
                {t("tracking.addStudent")}
              </h2>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-2 rounded-xl transition-all"
                style={{ background: "#dff3ff" }}
              >
                <X className="w-5 h-5" style={{ color: "#004aad" }} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: "#000000" }}>
                  {t("profile.firstName")}
                </label>
                <input
                  type="text"
                  value={newStudentFirstName}
                  onChange={(e) => setNewStudentFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{
                    background: "#dff3ff",
                    borderColor: "#38b6ff",
                  }}
                  placeholder={t("tracking.firstNamePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: "#000000" }}>
                  {t("profile.lastName")}
                </label>
                <input
                  type="text"
                  value={newStudentLastName}
                  onChange={(e) => setNewStudentLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{
                    background: "#dff3ff",
                    borderColor: "#38b6ff",
                  }}
                  placeholder={t("tracking.lastNamePlaceholder")}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-1 py-3 rounded-xl transition-all"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dff3ff",
                    color: "#000000",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={saving || !newStudentFirstName.trim() || !newStudentLastName.trim()}
                  className="flex-1 py-3 rounded-xl transition-all"
                  style={{
                    background:
                      saving || !newStudentFirstName.trim() || !newStudentLastName.trim()
                        ? "#64748b"
                        : "#004aad",
                    color: "#ffffff",
                  }}
                >
                  {saving ? t("common.adding") : t("tracking.addStudent")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
