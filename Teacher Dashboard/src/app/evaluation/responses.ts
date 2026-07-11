export type LetterMark = "check" | "x" | null;

/** true = passed, false = failed, null = not marked */
export type CheckboxMark = boolean | null;

export type EvaluationResponses =
  | {
      type: "workshop1";
      upperName: LetterMark[];
      upperSound: LetterMark[];
    }
  | {
      type: "workshop2";
      lowerName: LetterMark[];
      lowerSound: LetterMark[];
    }
  | {
      type: "workshop3";
      marks: LetterMark[];
    }
  | {
      type: "workshop4";
      marks: LetterMark[];
    }
  | {
      type: "checkboxes";
      values: boolean[];
    }
  | {
      type: "template_letter_grid";
      template_id: string;
      name: LetterMark[];
      sound: LetterMark[];
    }
  | {
      type: "template_checkboxes";
      template_id: string;
      values: CheckboxMark[];
    }
  | {
      type: "template_mcq";
      template_id: string;
      selections: Array<number | null>;
    };

/** @deprecated Legacy payloads still loaded for older saved rows. */
type LegacyEvaluationResponses =
  | {
      type: "atelier1";
      upperName: LetterMark[];
      upperSound: LetterMark[];
      lowerName: LetterMark[];
      lowerSound: LetterMark[];
    }
  | {
      type: "atelier2";
      upper: LetterMark[];
      lower: LetterMark[];
    }
  | {
      type: "atelier3";
      upper: LetterMark[];
    }
  | {
      type: "atelier4";
      lower: LetterMark[];
    };

export function checkboxContainerId(atelierNum: number): string | null {
  if (atelierNum <= 4) return null;
  return `atelier${atelierNum - 2}-content`;
}

export function collectResponses(
  atelierNum: number,
  state: {
    atelier1UpperName: LetterMark[];
    atelier1UpperSound: LetterMark[];
    atelier1LowerName: LetterMark[];
    atelier1LowerSound: LetterMark[];
    atelier2Upper: LetterMark[];
    atelier2Lower: LetterMark[];
    checkboxByWorkshop: Record<number, boolean[]>;
  }
): EvaluationResponses | null {
  if (atelierNum === 1) {
    return {
      type: "workshop1",
      upperName: state.atelier1UpperName,
      upperSound: state.atelier1UpperSound,
    };
  }

  if (atelierNum === 2) {
    return {
      type: "workshop2",
      lowerName: state.atelier1LowerName,
      lowerSound: state.atelier1LowerSound,
    };
  }

  if (atelierNum === 3) {
    return {
      type: "workshop3",
      marks: state.atelier2Upper,
    };
  }

  if (atelierNum === 4) {
    return {
      type: "workshop4",
      marks: state.atelier2Lower,
    };
  }

  const values = state.checkboxByWorkshop[atelierNum];
  if (!values || values.length === 0) return null;

  return { type: "checkboxes", values };
}

export function normalizeLoadedResponses(
  atelierNum: number,
  raw: unknown
): EvaluationResponses | null {
  if (!raw || typeof raw !== "object") return null;
  const responses = raw as EvaluationResponses | LegacyEvaluationResponses;

  switch (responses.type) {
    case "workshop1":
    case "workshop2":
    case "workshop3":
    case "workshop4":
    case "checkboxes":
    case "template_letter_grid":
    case "template_checkboxes":
    case "template_mcq":
      return responses;
    case "atelier1":
      if (atelierNum === 1) {
        return {
          type: "workshop1",
          upperName: responses.upperName,
          upperSound: responses.upperSound,
        };
      }
      if (atelierNum === 2) {
        return {
          type: "workshop2",
          lowerName: responses.lowerName,
          lowerSound: responses.lowerSound,
        };
      }
      return null;
    case "atelier2":
      if (atelierNum === 2) {
        return {
          type: "workshop2",
          lowerName: responses.upper,
          lowerSound: responses.lower,
        };
      }
      if (atelierNum === 3) {
        return { type: "workshop3", marks: responses.upper };
      }
      if (atelierNum === 4) {
        return { type: "workshop4", marks: responses.lower };
      }
      return null;
    case "atelier3":
      return atelierNum === 3
        ? { type: "workshop3", marks: responses.upper }
        : null;
    case "atelier4":
      return atelierNum === 4
        ? { type: "workshop4", marks: responses.lower }
        : null;
    default:
      return null;
  }
}

export function computeStatus(
  notRequired: boolean,
  responses: EvaluationResponses | null
): "success" | "adequate" | "needs-improvement" | "not-required" | null {
  if (notRequired) return "not-required";
  if (!responses) return null;

  if (responses.type === "workshop1") {
    return computeLetterMarksStatus([responses.upperName, responses.upperSound]);
  }

  if (responses.type === "workshop2") {
    return computeLetterMarksStatus([responses.lowerName, responses.lowerSound]);
  }

  if (responses.type === "workshop3" || responses.type === "workshop4") {
    return computeLetterMarksStatus([responses.marks]);
  }

  if (responses.type === "template_letter_grid") {
    return computeLetterMarksStatus([responses.name, responses.sound]);
  }

  if (responses.type === "template_checkboxes") {
    if (responses.values.length === 0) return null;
    const answered = responses.values.filter((value) => value !== null);
    if (answered.length === 0) return null;
    if (answered.every((value) => value === true)) return "success";
    if (answered.every((value) => value === false)) return "needs-improvement";

    const ratio = responses.values.filter((value) => value === true).length / responses.values.length;
    if (ratio >= 0.8) return "success";
    if (ratio >= 0.5) return "adequate";
    return "needs-improvement";
  }

  if (responses.type === "template_mcq") {
    if (responses.selections.every((selection) => selection === null)) return null;
    return "adequate";
  }

  if (responses.type === "checkboxes") {
    if (responses.values.length === 0) return null;
    if (responses.values.every(Boolean)) return "success";
    if (responses.values.every((v) => !v)) return "needs-improvement";

    const ratio = responses.values.filter(Boolean).length / responses.values.length;
    if (ratio >= 0.8) return "success";
    if (ratio >= 0.5) return "adequate";
    return "needs-improvement";
  }

  return null;
}

function computeLetterMarksStatus(
  groups: LetterMark[][]
): "success" | "adequate" | "needs-improvement" | null {
  const marks = groups.flat().filter((v) => v !== null);
  if (marks.length === 0) return null;
  if (marks.every((v) => v === "check")) return "success";
  if (marks.every((v) => v === "x")) return "needs-improvement";

  const ratio = marks.filter((v) => v === "check").length / marks.length;
  if (ratio >= 0.8) return "success";
  if (ratio >= 0.5) return "adequate";
  return "needs-improvement";
}

export const EVAL_CHECKBOX_COUNTS: Record<number, number> = {
  5: 15,
  6: 10,
  7: 15,
  8: 15,
  9: 15,
  10: 10,
  11: 20,
  12: 14,
  13: 10,
  14: 5,
  15: 6,
};
