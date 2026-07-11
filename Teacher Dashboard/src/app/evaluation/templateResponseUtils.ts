import type { CheckboxMark, LetterMark } from "./responses";
import { computeStatus } from "./responses";
import {
  defaultTemplateDraft,
  getWorkshopTemplate,
  isItemGridSection,
  isPassageSection,
  isSentenceReadingSection,
  isWordFamilySection,
  mergeStoredTemplateDraft,
  type CheckboxTableSection,
  type ComprehensionMixedSection,
  type FluencyMixedSection,
  type ItemGridSection,
  type LetterGridSection,
  type MixedSection,
  type ReadingMixedSection,
  type TemplateDraft,
  type WordSoundListSection,
  type WorkshopTemplate,
  type WorkshopTemplateId,
} from "./workshopTemplates";

export type TemplateEvalState = {
  letterName: LetterMark[];
  letterSound: LetterMark[];
  checkboxes: CheckboxMark[];
  mcqSelections: Array<number | null>;
};

export function classGradeToAssessmentGrade(classGrade: string): string {
  const map: Record<string, string> = {
    Maternelle: "Kindergarten",
    Kindergarten: "Kindergarten",
    "1re année": "Grade 1",
    "Grade 1": "Grade 1",
    "2e année": "Grade 2",
    "Grade 2": "Grade 2",
    "3e année": "Grade 3",
    "Grade 3": "Grade 3",
    "4e année": "Grade 3+",
    "5e année": "Grade 3+",
    "6e année": "Grade 3+",
    "Grade 3+": "Grade 3+",
    "Grade 4": "Grade 3+",
    "Grade 5": "Grade 3+",
    "Grade 6": "Grade 3+",
  };
  return map[classGrade] ?? classGrade;
}

export function resolveAssessmentDraft(
  templateId: WorkshopTemplateId,
  stored?: TemplateDraft | null
): TemplateDraft {
  return mergeStoredTemplateDraft(templateId, stored ?? undefined);
}

export function countTemplateCheckboxes(
  template: WorkshopTemplate,
  draft: TemplateDraft
): number {
  switch (template.format) {
    case "letter_grid":
    case "multiple_choice":
      return 0;
    case "checkbox_sections": {
      const sections = (draft.sections ?? []) as CheckboxTableSection[];
      return sections.reduce((total, section) => {
        const hasPassed = section.columns.some((column) => column.key === "passed");
        return total + (hasPassed ? section.rows.length : 0);
      }, 0);
    }
    case "word_sound_list": {
      const sections = (draft.sections ?? []) as WordSoundListSection[];
      return sections.reduce((total, section) => total + section.items.length, 0);
    }
    case "mixed_sections": {
      const sections = (draft.sections ?? []) as MixedSection[];
      return sections.reduce((total, section) => {
        if (isItemGridSection(section)) return total + section.items.length;
        const hasPassed = section.columns.some((column) => column.key === "passed");
        return total + (hasPassed ? section.rows.length : 0);
      }, 0);
    }
    case "item_grid_sections": {
      const sections = (draft.sections ?? []) as ItemGridSection[];
      return sections.reduce((total, section) => total + section.items.length, 0);
    }
    case "mixed_reading_sections": {
      const sections = (draft.sections ?? []) as ReadingMixedSection[];
      return sections.reduce((total, section) => {
        if (isWordFamilySection(section)) return total + section.families.length;
        return total + section.items.length;
      }, 0);
    }
    case "fluency_sections": {
      const sections = (draft.sections ?? []) as FluencyMixedSection[];
      return sections.reduce((total, section) => {
        if (isSentenceReadingSection(section)) {
          return total + section.sentences.length * section.criteria.length;
        }
        return total + section.items.length;
      }, 0);
    }
    case "comprehension_sections": {
      const sections = (draft.sections ?? []) as ComprehensionMixedSection[];
      return sections.reduce((total, section) => {
        if (isPassageSection(section)) return total;
        return total + section.questions.length;
      }, 0);
    }
    default:
      return 0;
  }
}

export function initTemplateEvalState(
  template: WorkshopTemplate,
  draft: TemplateDraft
): TemplateEvalState {
  if (template.format === "letter_grid") {
    const sections = (draft.sections ?? []) as LetterGridSection[];
    const letterCount = sections.reduce((total, section) => total + section.letters.length, 0);
    const hasName = sections.some((section) => section.columns.includes("name"));
    const hasSound = sections.some((section) => section.columns.includes("sound"));
    return {
      letterName: hasName ? Array(letterCount).fill(null) : [],
      letterSound: hasSound ? Array(letterCount).fill(null) : [],
      checkboxes: [],
      mcqSelections: [],
    };
  }

  if (template.format === "multiple_choice") {
    const questions = draft.questions ?? defaultTemplateDraft(template.id).questions ?? [];
    return {
      letterName: [],
      letterSound: [],
      checkboxes: [],
      mcqSelections: Array(questions.length).fill(null),
    };
  }

  const count = countTemplateCheckboxes(template, draft);
  return {
    letterName: [],
    letterSound: [],
    checkboxes: Array(count).fill(null),
    mcqSelections: [],
  };
}

export function applyTemplateBulkAction(
  action: "all_passed" | "all_failed" | "clear_all",
  template: WorkshopTemplate,
  state: TemplateEvalState,
  draft: TemplateDraft
): TemplateEvalState {
  if (template.format === "letter_grid") {
    if (action === "all_passed") {
      return {
        ...state,
        letterName: state.letterName.map(() => "check"),
        letterSound: state.letterSound.map(() => "check"),
      };
    }
    if (action === "all_failed") {
      return {
        ...state,
        letterName: state.letterName.map(() => "x"),
        letterSound: state.letterSound.map(() => "x"),
      };
    }
    return {
      ...state,
      letterName: state.letterName.map(() => null),
      letterSound: state.letterSound.map(() => null),
    };
  }

  const checkboxCount = Math.max(
    state.checkboxes.length,
    countTemplateCheckboxes(template, draft)
  );

  if (checkboxCount === 0) {
    if (action === "all_failed" || action === "clear_all") {
      return {
        ...state,
        mcqSelections: state.mcqSelections.map(() => null),
      };
    }
    return state;
  }

  if (action === "all_passed") {
    return { ...state, checkboxes: Array(checkboxCount).fill(true) };
  }
  if (action === "all_failed") {
    return { ...state, checkboxes: Array(checkboxCount).fill(false) };
  }
  if (action === "clear_all") {
    return {
      ...state,
      checkboxes: Array(checkboxCount).fill(null),
      mcqSelections: state.mcqSelections.map(() => null),
    };
  }
  return state;
}

export type TemplateEvaluationResponses =
  | {
      type: "template_letter_grid";
      template_id: WorkshopTemplateId;
      name: LetterMark[];
      sound: LetterMark[];
    }
  | {
      type: "template_checkboxes";
      template_id: WorkshopTemplateId;
      values: CheckboxMark[];
    }
  | {
      type: "template_mcq";
      template_id: WorkshopTemplateId;
      selections: Array<number | null>;
    };

export function collectTemplateResponses(
  templateId: WorkshopTemplateId,
  state: TemplateEvalState
): TemplateEvaluationResponses | null {
  const template = getWorkshopTemplate(templateId);

  if (template.format === "letter_grid") {
    const hasMarks =
      state.letterName.some((mark) => mark !== null) ||
      state.letterSound.some((mark) => mark !== null);
    if (!hasMarks) return null;
    return {
      type: "template_letter_grid",
      template_id: templateId,
      name: state.letterName,
      sound: state.letterSound,
    };
  }

  if (template.format === "multiple_choice") {
    const hasSelection = state.mcqSelections.some((selection) => selection !== null);
    if (!hasSelection) return null;
    return {
      type: "template_mcq",
      template_id: templateId,
      selections: state.mcqSelections,
    };
  }

  if (state.checkboxes.length === 0) return null;
  const hasAnswer = state.checkboxes.some((value) => value !== null);
  if (!hasAnswer) return null;
  return {
    type: "template_checkboxes",
    template_id: templateId,
    values: state.checkboxes,
  };
}

export function applySavedResponsesToTemplateState(
  templateId: WorkshopTemplateId,
  draft: TemplateDraft,
  raw: unknown,
  fallbackState: TemplateEvalState
): TemplateEvalState {
  if (!raw || typeof raw !== "object") return fallbackState;
  const responses = raw as Record<string, unknown>;
  const template = getWorkshopTemplate(templateId);

  if (responses.type === "template_letter_grid" && template.format === "letter_grid") {
    const name = Array.isArray(responses.name) ? (responses.name as LetterMark[]) : [];
    const sound = Array.isArray(responses.sound) ? (responses.sound as LetterMark[]) : [];
    return {
      ...fallbackState,
      letterName: padLetterMarks(name, fallbackState.letterName.length),
      letterSound: padLetterMarks(sound, fallbackState.letterSound.length),
      checkboxes: [],
    };
  }

  if (responses.type === "template_checkboxes") {
    const values = Array.isArray(responses.values)
      ? (responses.values as CheckboxMark[])
      : [];
    return {
      ...fallbackState,
      checkboxes: padCheckboxMarks(values, fallbackState.checkboxes.length),
    };
  }

  if (responses.type === "template_mcq") {
    const selections = Array.isArray(responses.selections)
      ? (responses.selections as Array<number | null>)
      : [];
    return {
      ...fallbackState,
      mcqSelections: padMcqSelections(selections, fallbackState.mcqSelections.length),
    };
  }

  if (template.format === "letter_grid" && responses.type === "workshop1") {
    return {
      ...fallbackState,
      letterName: padLetterMarks(
        Array.isArray(responses.upperName) ? (responses.upperName as LetterMark[]) : [],
        fallbackState.letterName.length
      ),
      letterSound: padLetterMarks(
        Array.isArray(responses.upperSound) ? (responses.upperSound as LetterMark[]) : [],
        fallbackState.letterSound.length
      ),
      checkboxes: [],
    };
  }

  if (responses.type === "checkboxes") {
    const values = Array.isArray(responses.values)
      ? (responses.values as CheckboxMark[])
      : [];
    return {
      ...fallbackState,
      checkboxes: padCheckboxMarks(values, fallbackState.checkboxes.length),
    };
  }

  return fallbackState;
}

function padLetterMarks(values: LetterMark[], length: number): LetterMark[] {
  return Array.from({ length }, (_, index) => values[index] ?? null);
}

function padCheckboxMarks(values: CheckboxMark[], length: number): CheckboxMark[] {
  return Array.from({ length }, (_, index) => {
    const value = values[index];
    if (value === true) return true;
    if (value === false) return false;
    return null;
  });
}

function padMcqSelections(values: Array<number | null>, length: number): Array<number | null> {
  return Array.from({ length }, (_, index) => {
    const value = values[index];
    return typeof value === "number" ? value : null;
  });
}

export function computeTemplateStatus(
  template: WorkshopTemplate,
  draft: TemplateDraft,
  state: TemplateEvalState,
  notRequired: boolean
): "success" | "adequate" | "needs-improvement" | "not-required" | null {
  if (notRequired) return "not-required";

  if (template.format === "multiple_choice") {
    const questions = draft.questions ?? [];
    const answered = state.mcqSelections.filter((selection) => selection !== null);
    if (answered.length === 0) return null;

    const correctCount = state.mcqSelections.reduce((total, selection, index) => {
      if (selection === null) return total;
      return selection === questions[index]?.correct ? total + 1 : total;
    }, 0);

    if (correctCount === questions.length) return "success";
    if (correctCount === 0) return "needs-improvement";

    const ratio = correctCount / questions.length;
    if (ratio >= 0.8) return "success";
    if (ratio >= 0.5) return "adequate";
    return "needs-improvement";
  }

  const responses = collectTemplateResponses(template.id, state);
  return computeStatus(false, responses as import("./responses").EvaluationResponses | null);
}

export function resolveTemplateForAssessment(
  templateId: WorkshopTemplateId,
  storedDraft?: TemplateDraft | null
): { template: WorkshopTemplate; draft: TemplateDraft } {
  const template = getWorkshopTemplate(templateId);
  const draft = storedDraft
    ? resolveAssessmentDraft(templateId, storedDraft)
    : defaultTemplateDraft(templateId);
  return { template, draft };
}
