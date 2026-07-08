import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  MessageSquare,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { LangToggle } from "../components/LangToggle";
import { useLanguage, type TranslationKey } from "../i18n";
import { teacherApi, type EvaluationStatus } from "../api/client";
import { exportStudentReportPdf } from "../utils/exportStudentReportPdf";

interface Evaluation {
  number: number;
  status: EvaluationStatus;
  date: string;
  comment?: string | null;
}

interface StudentReport {
  name: string;
  grade: string;
  classId: number;
  teacherDisplay: string;
  evaluations: Evaluation[];
}

type AtelierTitleKey =
  | "tracking.atelier1" | "tracking.atelier2" | "tracking.atelier3" | "tracking.atelier4"
  | "tracking.atelier5" | "tracking.atelier6" | "tracking.atelier7" | "tracking.atelier8"
  | "tracking.atelier9" | "tracking.atelier10" | "tracking.atelier11" | "tracking.atelier12"
  | "tracking.atelier13" | "tracking.atelier14" | "tracking.atelier15";

type StudentNavState = {
  classId?: number;
};

const GRADE_LABEL_KEYS: Record<string, TranslationKey> = {
  Maternelle: "grade.kindergarten",
  Jardin: "grade.garden",
  "1re année": "grade.grade1",
  "2e année": "grade.grade2",
};

const BENCHMARK_KEYS: Record<string, { expected: number; labelKey: TranslationKey }> = {
  Maternelle: { expected: 2, labelKey: "student.benchmarkEndK" },
  Jardin: { expected: 6, labelKey: "student.benchmarkEndPreK" },
  "1re année": { expected: 10, labelKey: "student.benchmarkEndG1" },
  "2e année": { expected: 14, labelKey: "student.benchmarkEndG2" },
};

function atelierTitleKey(number: number): AtelierTitleKey {
  return `tracking.atelier${number}` as AtelierTitleKey;
}

function loadStoredClassId(studentId: string | undefined): number | undefined {
  if (!studentId) return undefined;
  try {
    const raw = sessionStorage.getItem(`student-report-context-${studentId}`);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as StudentNavState;
    return stored.classId;
  } catch {
    return undefined;
  }
}

export function StudentDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();
  const { t, tp, auto } = useLanguage();
  const navState = (location.state as StudentNavState | null) ?? {};
  const [student, setStudent] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportHovered, setExportHovered] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const classId = navState.classId ?? loadStoredClassId(studentId);

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);
    setError(false);

    teacherApi
      .getStudent(studentId, classId)
      .then(({ student: data }) => {
        const report: StudentReport = {
          name: data.name,
          grade: data.grade,
          classId: data.class_id,
          teacherDisplay: data.teacher_display,
          evaluations: data.evaluations
            .filter((evaluation) => evaluation.status !== "not-required")
            .map((evaluation) => ({
              number: evaluation.number,
              status: evaluation.status,
              date: evaluation.date ?? "",
              comment: evaluation.comment,
            })),
        };
        setStudent(report);
        sessionStorage.setItem(
          `student-report-context-${studentId}`,
          JSON.stringify({ classId: data.class_id })
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [studentId, classId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#004aad" }} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>{t("student.notFound")}</p>
      </div>
    );
  }

  const getStatusColor = (status: EvaluationStatus | null) => {
    if (status === "success") return "#c9e265";
    if (status === "adequate") return "#ffde59";
    if (status === "needs-improvement") return "#ff5757";
    if (status === "not-required") return "#b8a3d6";
    return "#d1d5db";
  };

  const getStatusText = (status: EvaluationStatus | null) => {
    if (status === "success") return t("common.onTrack");
    if (status === "adequate") return t("common.monitor");
    if (status === "needs-improvement") return t("common.atRisk");
    if (status === "not-required") return t("common.notRequired");
    return t("student.statusNotEvaluated");
  };

  const completedCount = student.evaluations.length;
  const successCount = student.evaluations.filter((evaluation) => evaluation.status === "success").length;
  const successRate = completedCount > 0 ? Math.round((successCount / completedCount) * 100) : 0;

  const calculateCompetencyScore = (atelierNumbers: number[]) => {
    const relevantEvaluations = student.evaluations.filter((evaluation) =>
      atelierNumbers.includes(evaluation.number)
    );
    if (relevantEvaluations.length === 0) return 0;

    const totalScore = relevantEvaluations.reduce((sum, evaluation) => {
      if (evaluation.status === "success") return sum + 100;
      if (evaluation.status === "adequate") return sum + 70;
      if (evaluation.status === "needs-improvement") return sum + 40;
      return sum;
    }, 0);

    return Math.round(totalScore / relevantEvaluations.length);
  };

  const radarData = [
    { subjectKey: "student.skill.alphabetic" as const, score: calculateCompetencyScore([1, 2, 3, 4]) },
    { subjectKey: "student.skill.phonological" as const, score: calculateCompetencyScore([5, 6]) },
    { subjectKey: "student.skill.decoding" as const, score: calculateCompetencyScore([7, 8, 9, 10]) },
    { subjectKey: "student.skill.fluency" as const, score: calculateCompetencyScore([11, 12, 13]) },
    { subjectKey: "student.skill.comprehension" as const, score: calculateCompetencyScore([14, 15]) },
  ];

  const currentBenchmark = BENCHMARK_KEYS[student.grade] ?? BENCHMARK_KEYS["1re année"];
  const benchmarkProgress = Math.min(100, (completedCount / currentBenchmark.expected) * 100);
  const isOnTrack = completedCount >= currentBenchmark.expected;
  const isAhead = completedCount > currentBenchmark.expected;
  const gradeLabel = t(GRADE_LABEL_KEYS[student.grade] ?? "grade.grade1");

  const handleExportPdf = async () => {
    if (!reportRef.current || exporting) return;

    setExporting(true);
    try {
      await exportStudentReportPdf(reportRef.current, student.name);
      toast.success(t("student.exportSuccess"));
    } catch {
      toast.error(t("student.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const skillRows = [
    {
      labelKey: "student.skill.alphabetic" as const,
      score: radarData[0].score,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
    },
    {
      labelKey: "student.skill.phonological" as const,
      score: radarData[1].score,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ),
    },
    {
      labelKey: "student.skill.decoding" as const,
      score: radarData[2].score,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
    },
    {
      labelKey: "student.skill.fluency" as const,
      score: radarData[3].score,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12 Q6 6 10 12 Q14 18 18 12 Q22 6 26 12"/>
        </svg>
      ),
    },
    {
      labelKey: "student.skill.comprehension" as const,
      score: radarData[4].score,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#dff3ff" }}>
      <div
        className="p-6 border-b flex-shrink-0"
        style={{ background: "#ffffff", borderColor: "#dff3ff" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/class/${student.classId}`)}
              className="flex items-center gap-2 text-sm"
              style={{ color: "#38b6ff" }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("student.backToClass")}
            </button>

            <div className="flex items-center gap-4">
              <LangToggle />
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                onMouseEnter={() => setExportHovered(true)}
                onMouseLeave={() => setExportHovered(false)}
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: exportHovered && !exporting ? "#38b6ff" : "#004aad",
                  color: "#ffffff",
                  boxShadow: exportHovered && !exporting
                    ? "0 8px 20px rgba(0, 74, 173, 0.35)"
                    : "0 2px 8px rgba(0, 74, 173, 0.15)",
                  transform: exportHovered && !exporting ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                {exporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {exporting ? t("student.exporting") : t("student.exportReport")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div
              className="inline-block px-4 py-2 rounded-lg mb-3"
              style={{ background: "#004aad", color: "#ffffff" }}
            >
              <p className="text-sm">{t("tracking.smlSystem")}</p>
            </div>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {student.name}
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {gradeLabel} - {student.teacherDisplay}
            </p>
          </div>
          <div
            className="rounded-2xl p-6 shadow-lg mb-8"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl mb-2" style={{ color: "#004aad" }}>
                  {t("student.progressVsBenchmark")}
                </h2>
                <p className="text-sm" style={{ color: "#000000" }}>
                  {auto(`Attendu pour ${t(currentBenchmark.labelKey)}: ${currentBenchmark.expected} ateliers`)}
                </p>
              </div>
              <div
                className="px-6 py-3 rounded-xl"
                style={{
                  background: isOnTrack ? "#c9e265" : isAhead ? "#38b6ff" : "#ffde59",
                  color: "#000000",
                }}
              >
                <span className="text-lg">
                  {isAhead ? t("student.ahead") : isOnTrack ? t("student.onTrack") : t("student.needsSupport")}
                </span>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-full h-8 rounded-xl overflow-hidden"
                style={{ background: "#dff3ff" }}
              >
                <div
                  className="h-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{
                    width: `${benchmarkProgress}%`,
                    background: isOnTrack ? "#c9e265" : isAhead ? "#38b6ff" : "#ffde59",
                  }}
                >
                  <span style={{ color: "#000000" }}>
                    {completedCount}/{currentBenchmark.expected}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div
              className="rounded-2xl p-6 shadow-lg"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#dff3ff" }}
                >
                  <FileText className="w-6 h-6" style={{ color: "#004aad" }} />
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: "#000000" }}>
                {t("student.workshopsCompleted")}
              </p>
              <p className="text-3xl" style={{ color: "#004aad" }}>
                {completedCount}/15
              </p>
            </div>

            <div
              className="rounded-2xl p-6 shadow-lg"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#c9e265" }}
                >
                  <TrendingUp className="w-6 h-6" style={{ color: "#000000" }} />
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: "#000000" }}>
                {t("student.successRate")}
              </p>
              <p className="text-3xl" style={{ color: "#004aad" }}>
                {successRate}%
              </p>
            </div>

            <div
              className="rounded-2xl p-6 shadow-lg"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#dff3ff" }}
                >
                  <Calendar className="w-6 h-6" style={{ color: "#004aad" }} />
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: "#000000" }}>
                {t("student.lastWorkshop")}
              </p>
              <p className="text-lg" style={{ color: "#004aad" }}>
                {student.evaluations[student.evaluations.length - 1]?.date || "N/A"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div
              className="rounded-2xl p-6 shadow-lg"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <h2 className="text-xl mb-5" style={{ color: "#004aad" }}>
                {t("student.skillProfile")}
              </h2>

              <div className="flex items-center mb-2 pb-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                <span className="flex-1 text-sm font-semibold" style={{ color: "#374151" }}>{t("student.skill")}</span>
                <span className="text-sm font-semibold" style={{ color: "#374151", minWidth: 120 }}>{t("student.levelScore")}</span>
              </div>

              <div className="flex flex-col">
                {skillRows.map((row) => (
                  <div key={row.labelKey} className="flex items-center py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <div className="flex items-center gap-3 flex-1">
                      <span style={{ color: "#004aad", flexShrink: 0 }}>{row.icon}</span>
                      <span className="text-sm" style={{ color: "#1f2937" }}>{t(row.labelKey)}</span>
                    </div>
                    <div className="flex items-center gap-3" style={{ minWidth: 120 }}>
                      <span className="text-sm font-semibold" style={{ color: "#1f2937", width: 28, textAlign: "right" }}>
                        {row.score}
                      </span>
                      <div style={{ width: 80, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${row.score}%`,
                            background: "#004aad",
                            borderRadius: 4,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs mt-4" style={{ color: "#9ca3af" }}>
                {auto("Niveaux exprimés sur une échelle de 0 à 100.")}
              </p>
            </div>

            {(() => {
              const sorted = [...radarData].sort((a, b) => b.score - a.score);
              const forces = sorted.filter((item) => item.score >= 50);
              const prochaines = sorted.filter((item) => item.score < 50).reverse();
              return (
                <div className="rounded-2xl p-6 shadow-lg" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                  <h2 className="text-xl mb-6" style={{ color: "#004aad" }}>{t("student.resultsSummary")}</h2>

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ecfdf5", border: "2px solid #c9e265", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#059669">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </div>
                      <span className="font-bold text-base" style={{ color: "#059669" }}>
                        {t("student.strengths")} ({forces.length})
                      </span>
                    </div>
                    {forces.length > 0 ? (
                      <ul className="space-y-2 ml-10">
                        {forces.map((item) => (
                          <li key={item.subjectKey} className="text-sm flex items-center gap-2" style={{ color: "#374151" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", display: "inline-block", flexShrink: 0 }} />
                            {t(item.subjectKey)} ({item.score})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm ml-10" style={{ color: "#9ca3af" }}>{t("student.noStrengths")}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff1f2", border: "2px solid #ff5757", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/>
                          <circle cx="12" cy="12" r="4"/>
                          <line x1="12" y1="2" x2="12" y2="4"/>
                          <line x1="12" y1="20" x2="12" y2="22"/>
                          <line x1="2" y1="12" x2="4" y2="12"/>
                          <line x1="20" y1="12" x2="22" y2="12"/>
                        </svg>
                      </div>
                      <span className="font-bold text-base" style={{ color: "#ef4444" }}>
                        {t("student.nextSteps")} ({prochaines.length})
                      </span>
                    </div>
                    {prochaines.length > 0 ? (
                      <ul className="space-y-2 ml-10">
                        {prochaines.map((item) => (
                          <li key={item.subjectKey} className="text-sm flex items-center gap-2" style={{ color: "#374151" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
                            {t(item.subjectKey)} ({item.score})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm ml-10" style={{ color: "#9ca3af" }}>{t("student.noPriorities")}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div
            className="rounded-2xl p-8 shadow-lg mb-8"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <h2 className="text-2xl mb-6" style={{ color: "#004aad" }}>
              {t("student.workshopHistory")}
            </h2>

            <div className="space-y-4">
              {student.evaluations.map((evaluation) => (
                <div
                  key={evaluation.number}
                  className="p-6 rounded-xl border"
                  style={{ borderColor: "#dff3ff" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="inline-flex items-center justify-center rounded-lg text-sm font-medium shrink-0"
                          style={{
                            background: "#004aad",
                            color: "#ffffff",
                            padding: "6px 12px",
                            lineHeight: 1,
                            minHeight: 28,
                          }}
                        >
                          {tp("evaluation.workshopN", { n: evaluation.number })}
                        </span>
                        <h3 className="text-lg" style={{ color: "#004aad" }}>
                          {t(atelierTitleKey(evaluation.number))}
                        </h3>
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#000000", opacity: 0.7 }}>
                        {auto(`Complété le ${evaluation.date}`)}
                      </p>
                    </div>

                    <div
                      className="px-4 py-2 rounded-xl flex items-center gap-2"
                      style={{ background: getStatusColor(evaluation.status) }}
                    >
                      <span style={{ color: evaluation.status === "success" ? "#000000" : "#ffffff" }}>
                        {getStatusText(evaluation.status)}
                      </span>
                    </div>
                  </div>

                  {evaluation.comment && (
                    <div
                      className="mt-4 p-4 rounded-xl"
                      style={{ background: "#dff3ff" }}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#004aad" }} />
                        <div className="flex-1">
                          <p className="text-sm mb-1" style={{ color: "#004aad" }}>
                            {t("student.teacherComment")}
                          </p>
                          <p style={{ color: "#000000" }}>{auto(evaluation.comment)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
