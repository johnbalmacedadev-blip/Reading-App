import type { Dispatch, SetStateAction } from "react";
import type { TemplateDraft, WorkshopTemplate } from "../evaluation/workshopTemplates";
import type { TemplateEvalState } from "../evaluation/templateResponseUtils";
import { applyTemplateBulkAction } from "../evaluation/templateResponseUtils";
import { EvaluationBulkToolbar } from "./EvaluationBulkToolbar";
import { WorkshopTemplatePreview } from "./WorkshopTemplatePreview";
import type { CheckboxMark, LetterMark } from "../evaluation/responses";

type UnitColor = { bg: string; text: string };

export function WorkshopTemplateEvaluator({
  template,
  draft,
  state,
  onStateChange,
  unitNumber,
  unitColor,
}: {
  template: WorkshopTemplate;
  draft: TemplateDraft;
  state: TemplateEvalState;
  onStateChange: Dispatch<SetStateAction<TemplateEvalState>>;
  unitNumber: number;
  unitColor: UnitColor;
}) {
  const handleBulk = (action: "all_passed" | "all_failed" | "clear_all") => {
    onStateChange((prev) => applyTemplateBulkAction(action, template, prev, draft));
  };

  const setCheckbox = (index: number, value: CheckboxMark) => {
    onStateChange((prev) => {
      const checkboxes = [...prev.checkboxes];
      while (checkboxes.length <= index) {
        checkboxes.push(null);
      }
      checkboxes[index] = value;
      return { ...prev, checkboxes };
    });
  };

  const setLetterName = (index: number, mark: LetterMark) => {
    onStateChange((prev) => {
      const letterName = [...prev.letterName];
      letterName[index] = mark;
      return { ...prev, letterName };
    });
  };

  const setLetterSound = (index: number, mark: LetterMark) => {
    onStateChange((prev) => {
      const letterSound = [...prev.letterSound];
      letterSound[index] = mark;
      return { ...prev, letterSound };
    });
  };

  const setMcqSelection = (questionIndex: number, optionIndex: number) => {
    onStateChange((prev) => {
      const mcqSelections = [...prev.mcqSelections];
      mcqSelections[questionIndex] = optionIndex;
      return { ...prev, mcqSelections };
    });
  };

  return (
    <>
      <EvaluationBulkToolbar
        unitNumber={unitNumber}
        unitColor={unitColor}
        actions={template.bulkActions}
        onAllPassed={
          template.bulkActions.includes("all_passed")
            ? () => handleBulk("all_passed")
            : undefined
        }
        onAllFailed={
          template.bulkActions.includes("all_failed")
            ? () => handleBulk("all_failed")
            : undefined
        }
        onClearAll={
          template.bulkActions.includes("clear_all")
            ? () => handleBulk("clear_all")
            : undefined
        }
      />

      <WorkshopTemplatePreview
        template={template}
        draft={draft}
        evaluate={{
          checkboxValues: state.checkboxes,
          onCheckboxChange: setCheckbox,
          letterName: state.letterName,
          letterSound: state.letterSound,
          onLetterNameChange: setLetterName,
          onLetterSoundChange: setLetterSound,
          mcqSelections: state.mcqSelections,
          onMcqSelectionChange: setMcqSelection,
        }}
      />
    </>
  );
}
