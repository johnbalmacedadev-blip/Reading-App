import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, ChevronDown, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { teacherApi } from "../api/client";
import { WorkshopTemplateEvaluator } from "../components/WorkshopTemplateEvaluator";
import {
  CHECKBOX_BULK_ACTIONS,
  EvaluationBulkToolbar,
} from "../components/EvaluationBulkToolbar";
import {
  applySavedResponsesToTemplateState,
  classGradeToAssessmentGrade,
  collectTemplateResponses,
  computeTemplateStatus,
  initTemplateEvalState,
  resolveTemplateForAssessment,
  type TemplateEvalState,
} from "../evaluation/templateResponseUtils";
import type { WorkshopTemplateId } from "../evaluation/workshopTemplates";
import {
  collectResponses,
  computeStatus,
  EVAL_CHECKBOX_COUNTS,
  normalizeLoadedResponses,
  type LetterMark,
} from "../evaluation/responses";

type EvaluationNavState = {
  studentName?: string;
  classId?: number;
  schoolYear?: string;
};

function loadStoredContext(studentId: string | undefined): EvaluationNavState {
  if (!studentId) return {};
  try {
    const raw = sessionStorage.getItem(`eval-context-${studentId}`);
    if (!raw) return {};
    const stored = JSON.parse(raw) as EvaluationNavState & { evaluationDate?: string };
    return {
      studentName: stored.studentName,
      classId: stored.classId,
      schoolYear: stored.schoolYear,
    };
  } catch {
    return {};
  }
}

type AtelierTitleKey =
  | "tracking.atelier1" | "tracking.atelier2" | "tracking.atelier3" | "tracking.atelier4"
  | "tracking.atelier5" | "tracking.atelier6" | "tracking.atelier7" | "tracking.atelier8"
  | "tracking.atelier9" | "tracking.atelier10" | "tracking.atelier11" | "tracking.atelier12"
  | "tracking.atelier13" | "tracking.atelier14" | "tracking.atelier15";

const ATELIER_TITLE_KEYS: AtelierTitleKey[] = [
  "tracking.atelier1", "tracking.atelier2", "tracking.atelier3", "tracking.atelier4",
  "tracking.atelier5", "tracking.atelier6", "tracking.atelier7", "tracking.atelier8",
  "tracking.atelier9", "tracking.atelier10", "tracking.atelier11", "tracking.atelier12",
  "tracking.atelier13", "tracking.atelier14", "tracking.atelier15",
];

interface EvaluationItem {
  id: string;
  correct: boolean;
  incorrectResponse?: string;
}

const alphabetUpper = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const alphabetLower = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

const frequentWords = [
  "le", "de", "un", "petit", "papa", // First 5 (Atelier 6)
  "maman", "c'est", "voici", "dit", "ami", "avec", "grand", "a", "regarde", "pour", "une", "elle", "est", "il y a", "ici", // 15 words (Atelier 7)
  "dans", "mon", "aller", "cherche", "j'aime" // 5 words (Atelier 9)
];

export function EvaluationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, tp, auto: a } = useLanguage();
  const { studentId, evaluationNum } = useParams();
  const atelierNum = parseInt(evaluationNum || "1");
  const navState = (location.state ?? {}) as EvaluationNavState;

  const [evalContext, setEvalContext] = useState<EvaluationNavState>(() => ({
    ...loadStoredContext(studentId),
    ...navState,
  }));

  const [comments, setComments] = useState("");
  const [notRequired, setNotRequired] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [evaluationLoading, setEvaluationLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkboxByWorkshop, setCheckboxByWorkshop] = useState<Record<number, boolean[]>>({});
  const checkboxCounters = useRef<Record<number, number>>({});

  const emptyLetterMarks = () => new Array(26).fill(null) as LetterMark[];

  // State for Atelier 1 & 2 (check/X options)
  const [atelier1UpperName, setAtelier1UpperName] = useState<LetterMark[]>(emptyLetterMarks());
  const [atelier1UpperSound, setAtelier1UpperSound] = useState<LetterMark[]>(emptyLetterMarks());
  const [atelier1LowerName, setAtelier1LowerName] = useState<LetterMark[]>(emptyLetterMarks());
  const [atelier1LowerSound, setAtelier1LowerSound] = useState<LetterMark[]>(emptyLetterMarks());

  const [atelier2Upper, setAtelier2Upper] = useState<LetterMark[]>(emptyLetterMarks());
  const [atelier2Lower, setAtelier2Lower] = useState<LetterMark[]>(emptyLetterMarks());
  const [publishedAssessment, setPublishedAssessment] = useState<{
    id: number;
    title: string;
    template_id: WorkshopTemplateId;
    template_draft: import("../evaluation/workshopTemplates").TemplateDraft | null;
  } | null>(null);
  const [templateEvalState, setTemplateEvalState] = useState<TemplateEvalState | null>(null);

  const templateConfig = useMemo(() => {
    if (!publishedAssessment?.template_id) return null;
    return resolveTemplateForAssessment(
      publishedAssessment.template_id,
      publishedAssessment.template_draft
    );
  }, [publishedAssessment]);

  const studentName = evalContext.studentName ?? "—";
  const classId = evalContext.classId;
  const schoolYear = evalContext.schoolYear ?? "—";

  useEffect(() => {
    if (navState.studentName && studentId) {
      const context: EvaluationNavState = {
        studentName: navState.studentName,
        classId: navState.classId,
        schoolYear: navState.schoolYear,
      };
      sessionStorage.setItem(`eval-context-${studentId}`, JSON.stringify(context));
      setEvalContext(context);
    }
  }, [studentId, navState.studentName, navState.classId, navState.schoolYear]);

  useEffect(() => {
    if (!studentId || evalContext.studentName) return;

    teacherApi
      .getStudent(studentId)
      .then(({ student }) => {
        const context: EvaluationNavState = {
          studentName: student.name,
          classId: student.class_id,
          schoolYear: student.school_year,
        };
        sessionStorage.setItem(`eval-context-${studentId}`, JSON.stringify(context));
        setEvalContext(context);
      })
      .catch(() => {
        // Keep empty fallback if student cannot be loaded.
      });
  }, [studentId, evalContext.studentName]);

  useEffect(() => {
    if (!classId || evalContext.schoolYear) return;

    teacherApi
      .classDetail(classId)
      .then(({ class: classData }) => {
        setEvalContext((prev) => {
          const next = { ...prev, schoolYear: classData.school_year };
          if (studentId) {
            sessionStorage.setItem(`eval-context-${studentId}`, JSON.stringify(next));
          }
          return next;
        });
      })
      .catch(() => {
        // Keep empty fallback if class cannot be loaded.
      });
  }, [classId, evalContext.schoolYear, studentId]);

  const goBackToClass = () => {
    navigate(classId ? `/class/${classId}` : "/dashboard");
  };

  const goToWorkshop = (workshopNum: number) => {
    navigate(`/evaluation/${studentId}/${workshopNum}`, { state: evalContext });
  };

  const resetAtelierMarks = () => {
    setAtelier1UpperName(emptyLetterMarks());
    setAtelier1UpperSound(emptyLetterMarks());
    setAtelier1LowerName(emptyLetterMarks());
    setAtelier1LowerSound(emptyLetterMarks());
    setAtelier2Upper(emptyLetterMarks());
    setAtelier2Lower(emptyLetterMarks());
    setCheckboxByWorkshop({});
  };

  const setCheckboxValue = useCallback((workshop: number, index: number, checked: boolean) => {
    setCheckboxByWorkshop((prev) => {
      const current = prev[workshop] ?? [];
      const next = [...current];
      while (next.length <= index) next.push(false);
      next[index] = checked;
      return { ...prev, [workshop]: next };
    });
  }, []);

  const handleSelectAllCheckboxes = useCallback((workshop: number) => {
    const count = EVAL_CHECKBOX_COUNTS[workshop];
    if (!count) return;
    setCheckboxByWorkshop((prev) => ({
      ...prev,
      [workshop]: Array(count).fill(true),
    }));
  }, []);

  const handleClearAllCheckboxes = useCallback((workshop: number) => {
    const count = EVAL_CHECKBOX_COUNTS[workshop];
    if (!count) return;
    setCheckboxByWorkshop((prev) => ({
      ...prev,
      [workshop]: Array(count).fill(false),
    }));
  }, []);

  const renderCheckboxToolbar = (workshop: number) => (
    <EvaluationBulkToolbar
      unitNumber={getUnitNumber()}
      unitColor={getUnitColor()}
      actions={CHECKBOX_BULK_ACTIONS}
      onAllPassed={() => handleSelectAllCheckboxes(workshop)}
      onAllFailed={() => handleClearAllCheckboxes(workshop)}
      onClearAll={() => handleClearAllCheckboxes(workshop)}
    />
  );

  const renderEvalCheckbox = (
    className = "w-5 h-5 rounded",
    style: CSSProperties = {}
  ) => {
    const workshop = atelierNum;
    const index = checkboxCounters.current[workshop] ?? 0;
    checkboxCounters.current[workshop] = index + 1;
    const checked = checkboxByWorkshop[workshop]?.[index] ?? false;
    return (
      <input
        type="checkbox"
        data-eval-cb
        className={className}
        style={{
          accentColor: "#38b6ff",
          width: 20,
          height: 20,
          cursor: "pointer",
          ...style,
        }}
        checked={checked}
        onChange={(e) => setCheckboxValue(workshop, index, e.target.checked)}
      />
    );
  };

  useEffect(() => {
    if (!studentId) {
      setEvaluationLoading(false);
      return;
    }

    let cancelled = false;
    setEvaluationLoading(true);
    resetAtelierMarks();
    setComments("");
    setNotRequired(false);
    setPublishedAssessment(null);
    setTemplateEvalState(null);

    (async () => {
      try {
        let resolvedClassId = classId;
        let resolvedGrade: string | null = null;

        if (resolvedClassId) {
          const { class: classData } = await teacherApi.classDetail(resolvedClassId);
          resolvedGrade = classData.grade;
        } else {
          const { student } = await teacherApi.getStudent(studentId);
          resolvedClassId = student.class_id;
          resolvedGrade = student.grade;
          if (!cancelled) {
            const context: EvaluationNavState = {
              studentName: student.name,
              classId: student.class_id,
              schoolYear: student.school_year,
            };
            sessionStorage.setItem(`eval-context-${studentId}`, JSON.stringify(context));
            setEvalContext(context);
          }
        }

        if (!resolvedClassId) {
          throw new Error("Missing class context.");
        }

        if (!resolvedGrade) {
          const { class: classData } = await teacherApi.classDetail(resolvedClassId);
          resolvedGrade = classData.grade;
        }

        const assessmentGrade = classGradeToAssessmentGrade(resolvedGrade);
        let assessment: typeof publishedAssessment = null;
        try {
          const assessmentResponse = await teacherApi.getPublishedAssessment(
            atelierNum,
            assessmentGrade
          );
          assessment = assessmentResponse.assessment;
        } catch {
          assessment = null;
        }

        let nextTemplateState: TemplateEvalState | null = null;
        let resolvedTemplate = null;
        if (assessment?.template_id) {
          resolvedTemplate = resolveTemplateForAssessment(
            assessment.template_id,
            assessment.template_draft
          );
          nextTemplateState = initTemplateEvalState(
            resolvedTemplate.template,
            resolvedTemplate.draft
          );
        }

        const { evaluation } = await teacherApi.getEvaluation(
          studentId,
          atelierNum,
          resolvedClassId
        );
        if (cancelled) return;

        setPublishedAssessment(assessment);
        setComments(evaluation.comment ?? "");
        setNotRequired(Boolean(evaluation.not_required));

        if (assessment?.template_id && resolvedTemplate && nextTemplateState) {
          setTemplateEvalState(
            applySavedResponsesToTemplateState(
              assessment.template_id,
              resolvedTemplate.draft,
              evaluation.responses,
              nextTemplateState
            )
          );
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load saved evaluation.");
        }
      } finally {
        if (!cancelled) {
          setEvaluationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, classId, atelierNum]);

  // Add custom checkbox styling in global <style> below

  const handleToggle = (index: number) => {
    const newEvals = [...evaluations];
    newEvals[index].correct = !newEvals[index].correct;
    if (newEvals[index].correct) {
      newEvals[index].incorrectResponse = "";
    }
    setEvaluations(newEvals);
  };

  const handleIncorrectResponse = (index: number, value: string) => {
    const newEvals = [...evaluations];
    newEvals[index].incorrectResponse = value;
    setEvaluations(newEvals);
  };

  const handleSave = async () => {
    const saveClassId = classId ?? evalContext.classId;
    if (!studentId || !saveClassId) {
      toast.error("Missing class context. Open this evaluation from the class page.");
      return;
    }

    const hasPublishedTemplate = Boolean(publishedAssessment?.template_id && templateEvalState);
    if (!hasPublishedTemplate && !notRequired) {
      toast.error(t("evaluation.noAssessmentDesc"));
      return;
    }

    setSaving(true);
    try {
      const responses = hasPublishedTemplate
        ? collectTemplateResponses(publishedAssessment!.template_id, templateEvalState!)
        : null;
      const status = hasPublishedTemplate && templateConfig
        ? computeTemplateStatus(
            templateConfig.template,
            templateConfig.draft,
            templateEvalState!,
            notRequired
          )
        : computeStatus(notRequired, responses);

      await teacherApi.saveEvaluation(studentId, atelierNum, {
        class_id: saveClassId,
        status,
        not_required: notRequired,
        comment: comments,
        responses: responses as unknown as Record<string, unknown> | null,
      });

      toast.success(t("evaluation.savedSuccess"));
      goBackToClass();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderAtelier1 = () => {
    const unitColor = getUnitColor();
    return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: unitColor.bg }}>
          <span className="text-xs font-semibold" style={{ color: unitColor.text }}>{tp("tracking.unit", { n: getUnitNumber() })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAtelier1UpperName(new Array(26).fill('check'));
              setAtelier1UpperSound(new Array(26).fill('check'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#2e7d32", color: "#ffffff" }}
          >
            ✓ {t("evaluation.allPassed")}
          </button>
          <button
            onClick={() => {
              setAtelier1UpperName(new Array(26).fill('x'));
              setAtelier1UpperSound(new Array(26).fill('x'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#d32f2f", color: "#ffffff" }}
          >
            ✗ {t("evaluation.allFailed")}
          </button>
          <button
            onClick={() => {
              setAtelier1UpperName(new Array(26).fill(null));
              setAtelier1UpperSound(new Array(26).fill(null));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#666", color: "#ffffff" }}
          >
            {t("evaluation.clearAll")}
          </button>
          <a href="#" className="px-4 py-2 text-sm flex items-center" style={{ color: "#38b6ff" }}>
            📄 {t("evaluation.supportPdf")}
          </a>
        </div>
      </div>
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Présenter chaque lettre majuscule à l'élève et demander : \"Quel est le nom de cette lettre ?\" puis \"Quel son fait cette lettre ?\"")}
        </p>
      </div>

      <div>
        <div>
          <h3 className="text-lg mb-4" style={{ color: "#004aad" }}>{a("Lettres majuscules")}</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#38b6ff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#ffffff" }}>{t("evaluation.letter")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.nameCol")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.soundCol")}</th>
              </tr>
            </thead>
            <tbody>
              {alphabetUpper.map((letter, idx) => (
                <tr key={idx} className="border-b" style={{ borderColor: "#dff3ff" }}>
                  <td className="px-3 py-2 font-bold text-lg" style={{ color: "#004aad" }}>{letter}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const newArr = [...atelier1UpperName];
                          newArr[idx] = 'check';
                          setAtelier1UpperName(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1UpperName[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                          background: atelier1UpperName[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                        }}
                      >
                        {atelier1UpperName[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          const newArr = [...atelier1UpperName];
                          newArr[idx] = 'x';
                          setAtelier1UpperName(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1UpperName[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                          background: atelier1UpperName[idx] === 'x' ? '#ffebee' : '#ffffff',
                        }}
                      >
                        {atelier1UpperName[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const newArr = [...atelier1UpperSound];
                          newArr[idx] = 'check';
                          setAtelier1UpperSound(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1UpperSound[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                          background: atelier1UpperSound[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                        }}
                      >
                        {atelier1UpperSound[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          const newArr = [...atelier1UpperSound];
                          newArr[idx] = 'x';
                          setAtelier1UpperSound(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1UpperSound[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                          background: atelier1UpperSound[idx] === 'x' ? '#ffebee' : '#ffffff',
                        }}
                      >
                        {atelier1UpperSound[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
  };

  const renderAtelier2 = () => {
    const unitColor = getUnitColor();
    return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: unitColor.bg }}>
          <span className="text-xs font-semibold" style={{ color: unitColor.text }}>{tp("tracking.unit", { n: getUnitNumber() })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAtelier1LowerName(new Array(26).fill('check'));
              setAtelier1LowerSound(new Array(26).fill('check'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#2e7d32", color: "#ffffff" }}
          >
            ✓ {t("evaluation.allPassed")}
          </button>
          <button
            onClick={() => {
              setAtelier1LowerName(new Array(26).fill('x'));
              setAtelier1LowerSound(new Array(26).fill('x'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#d32f2f", color: "#ffffff" }}
          >
            ✗ {t("evaluation.allFailed")}
          </button>
          <button
            onClick={() => {
              setAtelier1LowerName(new Array(26).fill(null));
              setAtelier1LowerSound(new Array(26).fill(null));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#666", color: "#ffffff" }}
          >
            {t("evaluation.clearAll")}
          </button>
          <a href="#" className="px-4 py-2 text-sm flex items-center" style={{ color: "#38b6ff" }}>
            📄 {t("evaluation.supportPdf")}
          </a>
        </div>
      </div>
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Présenter chaque lettre minuscule à l'élève et demander : \"Quel est le nom de cette lettre ?\" puis \"Quel son fait cette lettre ?\"")}
        </p>
      </div>

      <div>
        <div>
          <h3 className="text-lg mb-4" style={{ color: "#004aad" }}>{a("Lettres minuscules")}</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#38b6ff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#ffffff" }}>{t("evaluation.letter")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.nameCol")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.soundCol")}</th>
              </tr>
            </thead>
            <tbody>
              {alphabetLower.map((letter, idx) => (
                <tr key={idx} className="border-b" style={{ borderColor: "#dff3ff" }}>
                  <td className="px-3 py-2 font-bold text-lg" style={{ color: "#004aad" }}>{letter}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const newArr = [...atelier1LowerName];
                          newArr[idx] = 'check';
                          setAtelier1LowerName(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1LowerName[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                          background: atelier1LowerName[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                        }}
                      >
                        {atelier1LowerName[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          const newArr = [...atelier1LowerName];
                          newArr[idx] = 'x';
                          setAtelier1LowerName(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1LowerName[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                          background: atelier1LowerName[idx] === 'x' ? '#ffebee' : '#ffffff',
                        }}
                      >
                        {atelier1LowerName[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const newArr = [...atelier1LowerSound];
                          newArr[idx] = 'check';
                          setAtelier1LowerSound(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1LowerSound[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                          background: atelier1LowerSound[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                        }}
                      >
                        {atelier1LowerSound[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                      </button>
                      <button
                        onClick={() => {
                          const newArr = [...atelier1LowerSound];
                          newArr[idx] = 'x';
                          setAtelier1LowerSound(newArr);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          border: `2px solid ${atelier1LowerSound[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                          background: atelier1LowerSound[idx] === 'x' ? '#ffebee' : '#ffffff',
                        }}
                      >
                        {atelier1LowerSound[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
  };

  const renderAtelier3 = () => {
    const unitColor = getUnitColor();
    return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: unitColor.bg }}>
          <span className="text-xs font-semibold" style={{ color: unitColor.text }}>{tp("tracking.unit", { n: getUnitNumber() })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAtelier2Upper(new Array(26).fill('check'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#2e7d32", color: "#ffffff" }}
          >
            ✓ {t("evaluation.allPassed")}
          </button>
          <button
            onClick={() => {
              setAtelier2Upper(new Array(26).fill('x'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#d32f2f", color: "#ffffff" }}
          >
            ✗ {t("evaluation.allFailed")}
          </button>
          <button
            onClick={() => {
              setAtelier2Upper(new Array(26).fill(null));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#666", color: "#ffffff" }}
          >
            {t("evaluation.clearAll")}
          </button>
          <a href="#" className="px-4 py-2 text-sm flex items-center" style={{ color: "#38b6ff" }}>
            📄 {t("evaluation.supportPdf")}
          </a>
        </div>
      </div>
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Dire le nom de chaque lettre majuscule à l'élève et lui demander de l'écrire.")}
        </p>
      </div>

      <div>
        <h3 className="text-lg mb-4" style={{ color: "#004aad" }}>{a("Écrire les lettres majuscules")}</h3>
        <div className="space-y-2">
          {alphabetUpper.map((letter, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#f7ffd6" }}>
              <span className="font-bold w-8" style={{ color: "#004aad" }}>{letter}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newArr = [...atelier2Upper];
                    newArr[idx] = 'check';
                    setAtelier2Upper(newArr);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    border: `2px solid ${atelier2Upper[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                    background: atelier2Upper[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                  }}
                >
                  {atelier2Upper[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                </button>
                <button
                  onClick={() => {
                    const newArr = [...atelier2Upper];
                    newArr[idx] = 'x';
                    setAtelier2Upper(newArr);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    border: `2px solid ${atelier2Upper[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                    background: atelier2Upper[idx] === 'x' ? '#ffebee' : '#ffffff',
                  }}
                >
                  {atelier2Upper[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
  };

  const renderAtelier4 = () => {
    const unitColor = getUnitColor();
    return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: unitColor.bg }}>
          <span className="text-xs font-semibold" style={{ color: unitColor.text }}>{tp("tracking.unit", { n: getUnitNumber() })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAtelier2Lower(new Array(26).fill('check'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#2e7d32", color: "#ffffff" }}
          >
            ✓ {t("evaluation.allPassed")}
          </button>
          <button
            onClick={() => {
              setAtelier2Lower(new Array(26).fill('x'));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#d32f2f", color: "#ffffff" }}
          >
            ✗ {t("evaluation.allFailed")}
          </button>
          <button
            onClick={() => {
              setAtelier2Lower(new Array(26).fill(null));
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#666", color: "#ffffff" }}
          >
            {t("evaluation.clearAll")}
          </button>
          <a href="#" className="px-4 py-2 text-sm flex items-center" style={{ color: "#38b6ff" }}>
            📄 {t("evaluation.supportPdf")}
          </a>
        </div>
      </div>
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Dire le nom de chaque lettre minuscule à l'élève et lui demander de l'écrire.")}
        </p>
      </div>

      <div>
        <h3 className="text-lg mb-4" style={{ color: "#004aad" }}>{a("Écrire les lettres minuscules")}</h3>
        <div className="space-y-2">
          {alphabetLower.map((letter, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#f7ffd6" }}>
              <span className="font-bold w-8" style={{ color: "#004aad" }}>{letter}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newArr = [...atelier2Lower];
                    newArr[idx] = 'check';
                    setAtelier2Lower(newArr);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    border: `2px solid ${atelier2Lower[idx] === 'check' ? '#2e7d32' : '#ccc'}`,
                    background: atelier2Lower[idx] === 'check' ? '#e8f5e9' : '#ffffff',
                  }}
                >
                  {atelier2Lower[idx] === 'check' && <span style={{ color: "#2e7d32", fontSize: "12px" }}>✓</span>}
                </button>
                <button
                  onClick={() => {
                    const newArr = [...atelier2Lower];
                    newArr[idx] = 'x';
                    setAtelier2Lower(newArr);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    border: `2px solid ${atelier2Lower[idx] === 'x' ? '#d32f2f' : '#ccc'}`,
                    background: atelier2Lower[idx] === 'x' ? '#ffebee' : '#ffffff',
                  }}
                >
                  {atelier2Lower[idx] === 'x' && <span style={{ color: "#d32f2f", fontSize: "12px" }}>✗</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
  };

  const renderAtelier5 = () => (
    <>
      {renderCheckboxToolbar(5)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la capacité de l'élève à identifier les rimes, segmenter/fusionner et compter les syllabes. Pour chaque section, demander à l'élève d'écouter attentivement et de répondre.")}
        </p>
      </div>

      <div id="atelier3-content" className="space-y-6">
        {/* Rhyming table */}
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Identifier des mots qui riment")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève : « Est-ce que ces mots riment? »")}</p>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#ffffff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Paire de mots")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Réponse correcte")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Réussi")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pair: "chat / rat", answer: "Oui" },
                { pair: "fleur / table", answer: "Non" },
                { pair: "bateau / chapeau", answer: "Oui" },
                { pair: "pain / main", answer: "Oui" },
                { pair: "lune / porte", answer: "Non" }
              ].map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #dff3ff" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{item.pair}</td>
                  <td className="px-3 py-2 text-center text-sm" style={{ color: "#666", border: "1px solid #dff3ff" }}>{a(item.answer)}</td>
                  <td className="px-3 py-2 text-center" style={{ border: "1px solid #dff3ff" }}>
                    {renderEvalCheckbox("w-5 h-5 rounded", { accentColor: "#2e7d32" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Segmenting table */}
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Segmenter et fusionner des syllabes")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Lire le mot segmenté. Demander à l'élève : « Quel mot est-ce que ça fait? »")}</p>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#ffffff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Mot segmenté")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Mot complet")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Réussi")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { segmented: "ma-man", full: "maman" },
                { segmented: "ta-ble", full: "table" },
                { segmented: "cha-peau", full: "chapeau" },
                { segmented: "voi-ture", full: "voiture" },
                { segmented: "ba-na-ne", full: "banane" }
              ].map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #dff3ff" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{item.segmented}</td>
                  <td className="px-3 py-2 text-center" style={{ color: "#666", border: "1px solid #dff3ff" }}>{item.full}</td>
                  <td className="px-3 py-2 text-center" style={{ border: "1px solid #dff3ff" }}>
                    {renderEvalCheckbox("w-5 h-5 rounded", { accentColor: "#2e7d32" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Syllable counting */}
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Compter les syllabes dans un mot")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>
            <strong>{t("evaluation.instructionsLabel")}</strong> {a("Dire le mot à l'élève. Demander : « Combien de syllabes entends-tu dans ce mot? » L'élève doit vous dire le nombre.")}
          </p>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#ffffff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Mot")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Nombre de syllabes")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Réussi")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { word: "chat", count: 1 },
                { word: "livre", count: 1 },
                { word: "éléphant", count: 3 },
                { word: "chocolat", count: 3 },
                { word: "papillon", count: 3 }
              ].map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #dff3ff" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{item.word}</td>
                  <td className="px-3 py-2 text-center" style={{ color: "#666", border: "1px solid #dff3ff" }}>{item.count}</td>
                  <td className="px-3 py-2 text-center" style={{ border: "1px solid #dff3ff" }}>
                    {renderEvalCheckbox("w-5 h-5 rounded", { accentColor: "#2e7d32" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderAtelier6 = () => (
    <>
      {renderCheckboxToolbar(6)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève d'identifier les sons au début et à la fin des mots. Dire le mot clairement et demander : « Quel son entends-tu au début/à la fin? »")}
        </p>
      </div>

      <div id="atelier4-content" className="grid grid-cols-2 gap-6">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Identifier le son au début d'un mot")}</h3>
          {[
            { word: "maison", sound: "/m/" },
            { word: "ballon", sound: "/b/" },
            { word: "soleil", sound: "/s/" },
            { word: "fenêtre", sound: "/f/" },
            { word: "chat", sound: "/ʃ/" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <span className="text-sm w-20 font-medium" style={{ color: "#004aad" }}>{item.word}</span>
              <span className="text-xs px-2 py-1 rounded" style={{ background: "#f0f0f0", color: "#666" }}>{item.sound}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Identifier le son à la fin d'un mot")}</h3>
          {[
            { word: "chat", sound: "/a/" },
            { word: "pomme", sound: "/m/" },
            { word: "souris", sound: "/i/" },
            { word: "sac", sound: "/k/" },
            { word: "fil", sound: "/l/" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <span className="text-sm w-20 font-medium" style={{ color: "#004aad" }}>{item.word}</span>
              <span className="text-xs px-2 py-1 rounded" style={{ background: "#f0f0f0", color: "#666" }}>{item.sound}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAtelier7 = () => (
    <>
      {renderCheckboxToolbar(7)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la lecture de syllabes simples et la correspondance son-lettre. Pour la section correspondance, montrer 3 lettres à l'élève et demander de pointer la lettre qui fait le son indiqué.")}
        </p>
      </div>

      <div id="atelier5-content" className="space-y-6">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire des syllabes CV, VC et CVC")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque syllabe.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {["ma", "li", "po", "ru", "sa", "il", "or", "pa", "mi", "bol"].map((syl, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-lg font-bold" style={{ color: "#004aad" }}>{syl}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Associer les sons aux graphèmes correspondants")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>
            <strong>{t("evaluation.instructionsLabel")}</strong> {a("Montrer 3 lettres à l'élève. Dire : « Pointe la lettre qui fait le son /___/. » Par exemple, montrer « b – f – l » et demander : « Pointe la lettre qui fait le son /f/. »")}
          </p>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#ffffff" }}>
                <th className="px-3 py-2 text-left text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Lettres montrées")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Son demandé")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Lettre correcte")}</th>
                <th className="px-3 py-2 text-center text-sm" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{a("Réussi")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { letters: "a – e – t", sound: "/a/", correct: "a" },
                { letters: "e – s – n", sound: "/e/", correct: "e" },
                { letters: "t – a – s", sound: "/t/", correct: "t" },
                { letters: "n – e – s", sound: "/s/", correct: "s" },
                { letters: "a – t – n", sound: "/n/", correct: "n" }
              ].map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #dff3ff" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#004aad", border: "1px solid #dff3ff" }}>{item.letters}</td>
                  <td className="px-3 py-2 text-center" style={{ color: "#666", border: "1px solid #dff3ff" }}>{item.sound}</td>
                  <td className="px-3 py-2 text-center font-bold" style={{ color: "#2e7d32", border: "1px solid #dff3ff" }}>{item.correct}</td>
                  <td className="px-3 py-2 text-center" style={{ border: "1px solid #dff3ff" }}>
                    {renderEvalCheckbox("w-5 h-5 rounded", { accentColor: "#2e7d32" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderAtelier8 = () => (
    <>
      {renderCheckboxToolbar(8)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la lecture de différents types de syllabes et de mots usuels.")}
        </p>
      </div>

      <div id="atelier6-content" className="space-y-6">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire des syllabes ouvertes et fermées")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque syllabe à voix haute.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {["ba", "li", "por", "val", "tur"].map((syl, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-lg font-bold" style={{ color: "#004aad" }}>{syl}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire des syllabes complexes - CVCC, CCVC")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque syllabe complexe à voix haute.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {["pla", "bri", "tro", "flan", "gros"].map((syl, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-lg font-bold" style={{ color: "#004aad" }}>{syl}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 5 mots usuels")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Ces mots doivent être reconnus instantanément. Demander à l'élève de lire chaque mot rapidement.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {frequentWords.slice(0, 5).map((word, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-lg font-semibold" style={{ color: "#004aad" }}>{word}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderAtelier9 = () => (
    <>
      {renderCheckboxToolbar(9)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève de lire les 15 mots usuels suivants.")}
        </p>
      </div>

      <div id="atelier7-content" className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
        <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 15 mots usuels")}</h3>
        <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque mot à voix haute.")}</p>
        <div className="grid grid-cols-5 gap-3">
          {frequentWords.slice(5, 20).map((word, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
              <span className="text-base font-semibold" style={{ color: "#004aad" }}>{word}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAtelier10 = () => (
    <>
      {renderCheckboxToolbar(10)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la lecture de mots contenant des graphèmes complexes. Demander à l'élève de lire chaque mot à voix haute.")}
        </p>
      </div>

      <div id="atelier8-content" className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
        <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 10 mots contenant: ch, gn, ou, oi, ai, au, eau")}</h3>
        <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Chaque graphème cible doit être représenté au moins une fois.")}</p>
        <div className="grid grid-cols-5 gap-3">
          {["chat", "agneau", "montagne", "oiseau", "maison", "bateau", "soupe", "lait", "auto", "poire"].map((word, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
              <span className="text-base font-semibold" style={{ color: "#004aad" }}>{word}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAtelier11 = () => (
    <>
      {renderCheckboxToolbar(11)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la capacité de l'élève à lire des familles de mots (variations d'un même mot), des mots avec différentes terminaisons, et des mots usuels.")}
        </p>
      </div>

      <div id="atelier9-content" className="space-y-6">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire et reconnaître des familles de mots")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire tous les mots de chaque famille et observer s'il reconnaît le lien entre eux.")}</p>
          {[
            ["grand", "grande", "grands", "grandes"],
            ["petit", "petite", "petits", "petites"],
            ["beau", "belle", "beaux", "belles"],
            ["chaud", "chaude", "chauds", "chaudes"],
            ["blanc", "blanche", "blancs", "blanches"]
          ].map((family, i) => (
            <div key={i} className="flex items-center gap-3 mb-3 p-2 rounded" style={{ background: "#ffffff" }}>
              <span className="text-sm flex-1" style={{ color: "#004aad" }}>{family.join(", ")}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire des mots avec les terminaisons fréquentes: -s, -es, -er, -ez, -ait, -aient")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("L'élève doit lire chaque mot en prononçant correctement la terminaison.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {["chats", "livres", "danser", "parlez", "jouait", "allaient", "tables", "manger", "marchez", "parlait"].map((word, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-2 rounded" style={{ background: "#ffffff" }}>
                <span className="text-sm font-semibold" style={{ color: "#004aad" }}>{word}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 5 mots usuels")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque mot à voix haute.")}</p>
          <div className="grid grid-cols-5 gap-3">
            {frequentWords.slice(20, 25).map((word, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-base font-semibold" style={{ color: "#004aad" }}>{word}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderAtelier12 = () => (
    <>
      {renderCheckboxToolbar(12)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève de lire les phrases à voix haute en respectant la ponctuation et l'intonation, puis de lire les pseudo-mots pour évaluer le décodage.")}
        </p>
      </div>

      <div id="atelier10-content" className="space-y-6">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 3 phrases répétées avec fluidité")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Demander à l'élève de lire chaque phrase plusieurs fois pour améliorer la fluidité.")}</p>
          {[
            "Le chat dort sur le canapé.",
            "Ma maman dort sur le canapé.",
            "L'enfant dort sur le canapé."
          ].map((sentence, i) => (
            <div key={i} className="mb-4 p-4 rounded-lg" style={{ background: "#ffffff" }}>
              <p className="text-base mb-3" style={{ color: "#004aad" }}>{sentence}</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  {renderEvalCheckbox("w-4 h-4 rounded")}
                  <span className="text-xs" style={{ color: "#666" }}>{a("Fluidité")}</span>
                </label>
                <label className="flex items-center gap-2">
                  {renderEvalCheckbox("w-4 h-4 rounded")}
                  <span className="text-xs" style={{ color: "#666" }}>{a("Ponctuation")}</span>
                </label>
                <label className="flex items-center gap-2">
                  {renderEvalCheckbox("w-4 h-4 rounded")}
                  <span className="text-xs" style={{ color: "#666" }}>{a("Intonation")}</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Amélioration du débit et de l'exactitude")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>
            <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève de lire ces pseudo-mots (mots inventés) pour évaluer ses compétences en décodage.")}
          </p>
          <div className="grid grid-cols-5 gap-3">
            {["choui", "groin", "drasse", "ploi", "trouche"].map((word, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
                <span className="text-lg font-bold" style={{ color: "#004aad" }}>{word}</span>
                {renderEvalCheckbox()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderAtelier13 = () => (
    <>
      {renderCheckboxToolbar(13)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Évaluer la lecture de mots contenant des graphèmes avancés (ail, eil, euil, ouil). Demander à l'élève de lire chaque mot à voix haute en identifiant le son cible.")}
        </p>
      </div>

      <div id="atelier11-content" className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
        <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Lire 10 mots contenant: ail, eil, euil, ouil")}</h3>
        <p className="text-sm mb-3" style={{ color: "#666" }}>{a("Chaque graphème doit être lu correctement dans le contexte du mot.")}</p>
        <div className="grid grid-cols-5 gap-3">
          {["travail", "soleil", "réveil", "fauteuil", "écureuil", "grenouille", "chandail", "appareil", "seuil", "citrouille"].map((word, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ background: "#ffffff" }}>
              <span className="text-base font-semibold" style={{ color: "#004aad" }}>{word}</span>
              {renderEvalCheckbox()}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAtelier14 = () => (
    <>
      {renderCheckboxToolbar(14)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève de visualiser l'histoire. Dire : « Ferme les yeux et imagine ce que tu entends pendant que je lis. » Lire le texte à voix haute, puis poser les 5 questions de compréhension.")}
        </p>
      </div>

      <div id="atelier12-content" className="space-y-4">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-3 font-bold" style={{ color: "#004aad" }}>{a("Texte lu par l'enseignant(e)")}</h3>
          <p className="text-sm mb-3" style={{ color: "#666" }}>
            {a("L'élève ferme les yeux et écoute attentivement pendant la lecture.")}
          </p>
          <div className="p-4 rounded leading-relaxed" style={{ background: "#ffffff" }}>
            <p className="text-sm mb-2" style={{ color: "#004aad" }}>
              C'est une belle journée d'été. Sophie et son frère Marc vont au parc avec leur chien Félix.
              Ils apportent un ballon rouge et un pique-nique. Au parc, ils jouent au ballon sur l'herbe verte.
              Félix court après le ballon et aboie joyeusement. Après le jeu, ils mangent des sandwichs et boivent du jus.
              Sophie et Marc sont très contents de leur journée au parc. Ils rentrent à la maison fatigués mais heureux.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Répondre à 5 questions de compréhension")}</h3>
          {[
            { q: "Où vont Sophie et Marc?", a: "Au parc" },
            { q: "Qui va au parc avec eux?", a: "Leur chien Félix / Félix" },
            { q: "De quelle couleur est le ballon?", a: "Rouge" },
            { q: "Que font-ils après le jeu?", a: "Ils mangent des sandwichs et boivent du jus" },
            { q: "Comment se sentent-ils à la fin?", a: "Fatigués mais heureux" }
          ].map((item, i) => (
            <div key={i} className="mb-3 p-3 rounded" style={{ background: "#ffffff" }}>
              <div className="flex items-start gap-3 mb-2">
                <span className="text-sm flex-1" style={{ color: "#004aad" }}>{a(item.q)}</span>
                {renderEvalCheckbox("w-5 h-5 rounded flex-shrink-0 mt-0.5")}
              </div>
              <p className="text-xs italic pl-3" style={{ color: "#2e7d32" }}>{a("[Réponse:")} {a(item.a)}]</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAtelier15 = () => (
    <>
      {renderCheckboxToolbar(15)}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a("Demander à l'élève de lire un court texte de 4-5 phrases de façon autonome, puis poser 5 questions de compréhension.")}
        </p>
      </div>

      <div id="atelier13-content" className="space-y-4">
        <div className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
          <h3 className="text-base mb-3 font-bold" style={{ color: "#004aad" }}>{a("Texte lu par l'élève (lecture autonome)")}</h3>
          <div className="p-4 rounded leading-relaxed" style={{ background: "#ffffff" }}>
            <p className="text-base" style={{ color: "#004aad", lineHeight: "1.8" }}>
              Mon chat s'appelle Minou. Il est noir et blanc avec de grands yeux verts.
              Minou aime dormir sur mon lit et jouer avec une balle rouge.
              Tous les matins, il boit du lait dans son bol bleu.
              C'est mon meilleur ami!
            </p>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2">
              {renderEvalCheckbox("w-4 h-4 rounded")}
              <span className="text-sm" style={{ color: "#666" }}>{a("Fluidité de lecture")}</span>
            </label>
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#f7ffd6" }}>
          <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a("Répondre à 5 questions de compréhension")}</h3>
          {[
            { q: "Comment s'appelle le chat?", a: "Minou" },
            { q: "De quelle couleur est le chat?", a: "Noir et blanc" },
            { q: "Qu'est-ce que Minou aime faire?", a: "Dormir sur le lit et jouer avec une balle rouge" },
            { q: "De quelle couleur est son bol?", a: "Bleu" },
            { q: "Quand est-ce que Minou boit du lait?", a: "Tous les matins" }
          ].map((item, i) => (
            <div key={i} className="mb-3 p-3 rounded" style={{ background: "#ffffff" }}>
              <div className="flex items-start gap-3 mb-2">
                <span className="text-sm flex-1" style={{ color: "#004aad" }}>{a(item.q)}</span>
                {renderEvalCheckbox("w-5 h-5 rounded flex-shrink-0 mt-0.5")}
              </div>
              <p className="text-xs italic pl-3" style={{ color: "#2e7d32" }}>{a("[Réponse:")} {a(item.a)}]</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const getAtelierTitle = () => {
    if (publishedAssessment?.title) {
      return publishedAssessment.title;
    }
    const key = ATELIER_TITLE_KEYS[atelierNum - 1];
    return key ? t(key) : t("tracking.atelier1");
  };

  const getUnitNumber = () => {
    if (atelierNum <= 6) return 1;
    if (atelierNum === 7) return 2;
    if (atelierNum === 8) return 3;
    if (atelierNum === 9) return 4;
    if (atelierNum === 10) return 5;
    if (atelierNum === 11) return 6;
    if (atelierNum === 12) return 7;
    if (atelierNum === 13) return 8;
    if (atelierNum === 14) return 9;
    if (atelierNum === 15) return 10;
    return 1;
  };

  const getUnitColor = () => {
    const unitNum = getUnitNumber();
    const colors: Record<number, { bg: string; text: string }> = {
      1: { bg: "#3b82f6", text: "#ffffff" },
      2: { bg: "#38bdf8", text: "#000000" },
      3: { bg: "#22d3ee", text: "#000000" },
      4: { bg: "#a3e635", text: "#000000" },
      5: { bg: "#fbbf24", text: "#000000" },
      6: { bg: "#fb923c", text: "#000000" },
      7: { bg: "#fb7185", text: "#000000" },
      8: { bg: "#a855f7", text: "#ffffff" },
      9: { bg: "#0ea5e9", text: "#ffffff" },
      10: { bg: "#ef4444", text: "#ffffff" },
    };
    return colors[unitNum] || colors[1];
  };

  const renderAtelierContent = () => {
    if (templateConfig && templateEvalState) {
      return (
        <WorkshopTemplateEvaluator
          template={templateConfig.template}
          draft={templateConfig.draft}
          state={templateEvalState}
          onStateChange={setTemplateEvalState}
          unitNumber={getUnitNumber()}
          unitColor={getUnitColor()}
        />
      );
    }

    return (
      <div
        className="p-12 rounded-xl text-center"
        style={{ background: "#fff9e6", border: "2px solid #ffde59" }}
      >
        <p className="text-2xl mb-3" style={{ color: "#004aad" }}>
          {t("evaluation.noAssessmentTitle")}
        </p>
        <p className="text-lg" style={{ color: "#000000" }}>
          {t("evaluation.noAssessmentDesc")}
        </p>
      </div>
    );
  };

  const hasPublishedTemplate = Boolean(templateConfig && templateEvalState);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#dff3ff" }}>
      <style>{`
        input[type="checkbox"] {
          accent-color: #2e7d32;
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        input[type="checkbox"]:checked {
          background-color: #2e7d32;
          border-color: #2e7d32;
        }
      `}</style>
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0" style={{ background: "#ffffff", borderColor: "#dff3ff" }}>
        <div className="max-w-7xl mx-auto">
          <button
            onClick={goBackToClass}
            className="flex items-center gap-2 mb-4 text-sm"
            style={{ color: "#38b6ff" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("evaluation.backToTracking")}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="inline-block px-4 py-2 rounded-lg mb-3" style={{ background: "#004aad", color: "#ffffff" }}>
                <p className="text-sm">{t("evaluation.smlSystem")}</p>
              </div>
              <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
                {getAtelierTitle()}
              </h1>
              <p className="text-lg" style={{ color: "#000000" }}>
                {studentName}
              </p>
              <p className="text-sm" style={{ color: "#000000", opacity: 0.7 }}>
                {schoolYear}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <LangToggle className="" />

              <button className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all" style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}>
                <History className="w-5 h-5" />
                {t("evaluation.history")}
              </button>

              <div className="relative">
                <select
                  value={atelierNum}
                  onChange={(e) => goToWorkshop(Number(e.target.value))}
                  className="px-6 py-3 rounded-xl appearance-none pr-12"
                  style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{tp("evaluation.workshopN", { n: num })}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: "#004aad" }} />
              </div>

              <label className="px-6 py-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all whitespace-nowrap"
                style={{ background: notRequired ? "#ffde59" : "#ffffff", border: `1px solid ${notRequired ? "#ffde59" : "#dff3ff"}`, color: "#000000" }}>
                <input type="checkbox" checked={notRequired} onChange={(e) => setNotRequired(e.target.checked)} className="w-5 h-5 rounded flex-shrink-0" style={{ accentColor: "#004aad" }} />
                <span className="whitespace-nowrap">{t("evaluation.notRequired")}</span>
              </label>

              <button
                onClick={handleSave}
                disabled={saving || evaluationLoading || (!hasPublishedTemplate && !notRequired)}
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-60"
                style={{ background: "#004aad", color: "#ffffff" }}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {t("evaluation.save")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl p-8 shadow-lg" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            {notRequired ? (
              <div className="p-12 rounded-xl text-center" style={{ background: "#fff9e6", border: "2px solid #ffde59" }}>
                <p className="text-2xl mb-3" style={{ color: "#004aad" }}>
                  {t("evaluation.markedNotRequired")}
                </p>
                <p className="text-lg" style={{ color: "#000000" }}>
                  {t("evaluation.notRequiredDesc")}
                </p>
              </div>
            ) : evaluationLoading ? (
              <div className="py-16 flex items-center justify-center gap-2" style={{ color: "#004aad" }}>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading evaluation…
              </div>
            ) : (
              <>
                {renderAtelierContent()}

                {hasPublishedTemplate && (
                <div className="mt-8">
                  <label className="block mb-2" style={{ color: "#004aad" }}>
                    {t("evaluation.comments")}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{ background: "#ffffff", borderColor: "#dff3ff" }}
                    placeholder={t("evaluation.addComments")}
                  />
                </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
