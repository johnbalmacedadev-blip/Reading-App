import { CheckSquare, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useLanguage } from "../i18n";
import type { CheckboxMark, LetterMark } from "../evaluation/responses";
import type {
  CheckboxTableSection,
  ComprehensionMixedSection,
  ComprehensionQuestionsSection,
  FluencyMixedSection,
  ItemGridSection,
  LetterGridSection,
  MixedSection,
  MultipleChoiceQuestion,
  ReadingMixedSection,
  SentenceReadingSection,
  TemplateDraft,
  WordFamilySection,
  WordSoundListSection,
  WorkshopTemplate,
} from "../evaluation/workshopTemplates";
import {
  MULTIPLE_CHOICE_OPTION_COUNT,
  createEmptyMultipleChoiceQuestion,
  defaultTemplateDraft,
  isItemGridSection,
  isPassageSection,
  isSentenceReadingSection,
  isWordFamilySection,
  normalizeMultipleChoiceQuestion,
} from "../evaluation/workshopTemplates";

const editableInputStyle = {
  color: "#004aad",
  border: "1px solid #dff3ff",
  background: "#ffffff",
  outline: "none",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box" as const,
};

const editableTextareaStyle = {
  ...editableInputStyle,
  resize: "vertical" as const,
  minHeight: 48,
};

function itemGridSectionBackground(variant?: ItemGridSection["variant"]) {
  return variant === "highlight" ? "#f7ffd6" : "#dff3ff";
}

function PreviewMarkButton({ variant }: { variant: "check" | "x" | "empty" }) {
  if (variant === "empty") {
    return (
      <div
        className="w-5 h-5 rounded"
        style={{ border: "2px solid #ccc", background: "#ffffff" }}
      />
    );
  }

  const isCheck = variant === "check";
  return (
    <div
      className="w-5 h-5 rounded flex items-center justify-center"
      style={{
        border: `2px solid ${isCheck ? "#2e7d32" : "#d32f2f"}`,
        background: isCheck ? "#e8f5e9" : "#ffebee",
      }}
    >
      <span style={{ color: isCheck ? "#2e7d32" : "#d32f2f", fontSize: 12 }}>
        {isCheck ? "✓" : "✗"}
      </span>
    </div>
  );
}

function InteractiveMarkPair({
  marks,
  rowIndex,
  onChange,
}: {
  marks: LetterMark[];
  rowIndex: number;
  onChange: (index: number, mark: LetterMark) => void;
}) {
  const current = marks[rowIndex] ?? null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(rowIndex, current === "check" ? null : "check")}
        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
        style={{
          border: `2px solid ${current === "check" ? "#2e7d32" : "#ccc"}`,
          background: current === "check" ? "#e8f5e9" : "#ffffff",
        }}
      >
        {current === "check" && <span style={{ color: "#2e7d32", fontSize: 12 }}>✓</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange(rowIndex, current === "x" ? null : "x")}
        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
        style={{
          border: `2px solid ${current === "x" ? "#d32f2f" : "#ccc"}`,
          background: current === "x" ? "#ffebee" : "#ffffff",
        }}
      >
        {current === "x" && <span style={{ color: "#d32f2f", fontSize: 12 }}>✗</span>}
      </button>
    </div>
  );
}

function InteractiveCheckboxMark({
  value,
  index,
  onChange,
  className = "w-5 h-5 rounded",
}: {
  value: CheckboxMark;
  index: number;
  onChange: (index: number, value: CheckboxMark) => void;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(index, value === true ? null : true)}
        className={`${className} flex items-center justify-center cursor-pointer transition-all`}
        style={{
          border: `2px solid ${value === true ? "#2e7d32" : "#ccc"}`,
          background: value === true ? "#e8f5e9" : "#ffffff",
        }}
      >
        {value === true && <span style={{ color: "#2e7d32", fontSize: 12 }}>✓</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange(index, value === false ? null : false)}
        className={`${className} flex items-center justify-center cursor-pointer transition-all`}
        style={{
          border: `2px solid ${value === false ? "#d32f2f" : "#ccc"}`,
          background: value === false ? "#ffebee" : "#ffffff",
        }}
      >
        {value === false && <span style={{ color: "#d32f2f", fontSize: 12 }}>✗</span>}
      </button>
    </div>
  );
}

export type TemplateEvaluateProps = {
  checkboxValues: CheckboxMark[];
  onCheckboxChange: (index: number, value: CheckboxMark) => void;
  letterName: LetterMark[];
  letterSound: LetterMark[];
  onLetterNameChange: (index: number, mark: LetterMark) => void;
  onLetterSoundChange: (index: number, mark: LetterMark) => void;
  mcqSelections: Array<number | null>;
  onMcqSelectionChange: (questionIndex: number, optionIndex: number) => void;
};

export function WorkshopTemplatePreview({
  template,
  draft,
  onDraftChange,
  editable = false,
  evaluate,
}: {
  template: WorkshopTemplate;
  draft?: TemplateDraft;
  onDraftChange?: (draft: TemplateDraft) => void;
  editable?: boolean;
  evaluate?: TemplateEvaluateProps;
}) {
  const { t, auto: a } = useLanguage();
  const resolvedDraft = draft ?? defaultTemplateDraft(template.id);
  const canEdit = editable && !!onDraftChange && !evaluate;

  let nextCheckboxIndex = 0;

  const renderCheckbox = (
    className = "w-5 h-5 rounded",
    style: CSSProperties = {}
  ) => {
    if (!evaluate) {
      return (
        <input
          type="checkbox"
          disabled
          className={className}
          style={{ accentColor: "#2e7d32", ...style }}
        />
      );
    }

    const index = nextCheckboxIndex++;
    const value = evaluate.checkboxValues[index] ?? null;
    return (
      <InteractiveCheckboxMark
        key={`template-eval-cb-${index}-${value === true ? 1 : value === false ? 2 : 0}`}
        value={value}
        index={index}
        onChange={evaluate.onCheckboxChange}
        className={className}
      />
    );
  };

  const updateInstructions = (value: string) => {
    onDraftChange?.({ ...resolvedDraft, instructionsFr: value });
  };

  const updateLetterSection = (sectionIndex: number, patch: Partial<LetterGridSection>) => {
    const sections = [...(resolvedDraft.sections as LetterGridSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateCheckboxSection = (sectionIndex: number, patch: Partial<CheckboxTableSection>) => {
    const sections = [...(resolvedDraft.sections as CheckboxTableSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateRowCell = (
    sectionIndex: number,
    rowIndex: number,
    columnKey: string,
    value: string
  ) => {
    const sections = [...(resolvedDraft.sections as CheckboxTableSection[])];
    const rows = [...sections[sectionIndex].rows];
    const parsedValue = columnKey === "count" ? Number(value) || 0 : value;
    rows[rowIndex] = { ...rows[rowIndex], [columnKey]: parsedValue };
    sections[sectionIndex] = { ...sections[sectionIndex], rows };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateWordSoundSection = (sectionIndex: number, patch: Partial<WordSoundListSection>) => {
    const sections = [...(resolvedDraft.sections as WordSoundListSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateWordSoundItem = (
    sectionIndex: number,
    itemIndex: number,
    field: "word" | "sound",
    value: string
  ) => {
    const sections = [...(resolvedDraft.sections as WordSoundListSection[])];
    const items = [...sections[sectionIndex].items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    sections[sectionIndex] = { ...sections[sectionIndex], items };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateMixedSection = (sectionIndex: number, patch: Partial<MixedSection>) => {
    const sections = [...(resolvedDraft.sections as MixedSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch } as MixedSection;
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateMixedItemGridItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as MixedSection[])];
    const section = sections[sectionIndex] as ItemGridSection;
    const items = [...section.items];
    items[itemIndex] = value;
    sections[sectionIndex] = { ...section, items };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateMixedRowCell = (
    sectionIndex: number,
    rowIndex: number,
    columnKey: string,
    value: string
  ) => {
    const sections = [...(resolvedDraft.sections as MixedSection[])];
    const section = sections[sectionIndex] as CheckboxTableSection;
    const rows = [...section.rows];
    const parsedValue = columnKey === "count" ? Number(value) || 0 : value;
    rows[rowIndex] = { ...rows[rowIndex], [columnKey]: parsedValue };
    sections[sectionIndex] = { ...section, rows };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateItemGridSection = (sectionIndex: number, patch: Partial<ItemGridSection>) => {
    const sections = [...(resolvedDraft.sections as ItemGridSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateItemGridItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as ItemGridSection[])];
    const items = [...sections[sectionIndex].items];
    items[itemIndex] = value;
    sections[sectionIndex] = { ...sections[sectionIndex], items };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateReadingMixedSection = (sectionIndex: number, patch: Partial<ReadingMixedSection>) => {
    const sections = [...(resolvedDraft.sections as ReadingMixedSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch } as ReadingMixedSection;
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateWordFamilyRow = (sectionIndex: number, familyIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as ReadingMixedSection[])];
    const section = sections[sectionIndex] as WordFamilySection;
    const families = [...section.families];
    families[familyIndex] = value.split(",").map((word) => word.trim()).filter(Boolean);
    sections[sectionIndex] = { ...section, families };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateReadingGridItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as ReadingMixedSection[])];
    const section = sections[sectionIndex] as ItemGridSection;
    const items = [...section.items];
    items[itemIndex] = value;
    sections[sectionIndex] = { ...section, items };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateFluencyMixedSection = (sectionIndex: number, patch: Partial<FluencyMixedSection>) => {
    const sections = [...(resolvedDraft.sections as FluencyMixedSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch } as FluencyMixedSection;
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateSentenceText = (sectionIndex: number, sentenceIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as FluencyMixedSection[])];
    const section = sections[sectionIndex] as SentenceReadingSection;
    const sentences = [...section.sentences];
    sentences[sentenceIndex] = value;
    sections[sectionIndex] = { ...section, sentences };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateSentenceCriterion = (sectionIndex: number, criterionIndex: number, labelFr: string) => {
    const sections = [...(resolvedDraft.sections as FluencyMixedSection[])];
    const section = sections[sectionIndex] as SentenceReadingSection;
    const criteria = [...section.criteria];
    criteria[criterionIndex] = { ...criteria[criterionIndex], labelFr };
    sections[sectionIndex] = { ...section, criteria };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateFluencyGridItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const sections = [...(resolvedDraft.sections as FluencyMixedSection[])];
    const section = sections[sectionIndex] as ItemGridSection;
    const items = [...section.items];
    items[itemIndex] = value;
    sections[sectionIndex] = { ...section, items };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateComprehensionMixedSection = (
    sectionIndex: number,
    patch: Partial<ComprehensionMixedSection>
  ) => {
    const sections = [...(resolvedDraft.sections as ComprehensionMixedSection[])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch } as ComprehensionMixedSection;
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const updateComprehensionQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: "questionFr" | "answerFr",
    value: string
  ) => {
    const sections = [...(resolvedDraft.sections as ComprehensionMixedSection[])];
    const section = sections[sectionIndex] as ComprehensionQuestionsSection;
    const questions = [...section.questions];
    questions[questionIndex] = { ...questions[questionIndex], [field]: value };
    sections[sectionIndex] = { ...section, questions };
    onDraftChange?.({ ...resolvedDraft, sections });
  };

  const resolvedQuestions =
    resolvedDraft.questions ??
    defaultTemplateDraft(template.id).questions ??
    [];

  const updateQuestions = (questions: MultipleChoiceQuestion[]) => {
    onDraftChange?.({ ...resolvedDraft, questions });
  };

  const updateQuestion = (
    questionIndex: number,
    patch: Partial<Pick<MultipleChoiceQuestion, "text" | "correct">>
  ) => {
    const questions = resolvedQuestions.map((question, index) =>
      index === questionIndex ? normalizeMultipleChoiceQuestion({ ...question, ...patch }) : question
    );
    updateQuestions(questions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const questions = resolvedQuestions.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return normalizeMultipleChoiceQuestion({ ...question, options });
    });
    updateQuestions(questions);
  };

  const deleteQuestion = (questionIndex: number) => {
    updateQuestions(resolvedQuestions.filter((_, index) => index !== questionIndex));
  };

  const addQuestion = () => {
    updateQuestions([...resolvedQuestions, createEmptyMultipleChoiceQuestion()]);
  };

  const primaryCellKeys = new Set(["pair", "segmented", "word", "letters", "correct"]);

  const renderInstructions = () => (
    <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
      {canEdit ? (
        <label className="block">
          <span className="text-sm font-semibold" style={{ color: "#004aad" }}>
            {t("evaluation.instructionsLabel")}
          </span>
          <textarea
            value={resolvedDraft.instructionsFr}
            onChange={(e) => updateInstructions(e.target.value)}
            rows={3}
            className="mt-2 w-full px-3 py-2 rounded-lg text-sm resize-y"
            style={{
              color: "#004aad",
              border: "1px solid #ffde59",
              background: "#ffffff",
              outline: "none",
              minHeight: 72,
            }}
          />
        </label>
      ) : (
        <p className="text-sm" style={{ color: "#004aad" }}>
          <strong>{t("evaluation.instructionsLabel")}</strong> {a(resolvedDraft.instructionsFr)}
        </p>
      )}
    </div>
  );

  if (template.format === "multiple_choice") {
    const mcqInputStyle = {
      width: "100%",
      padding: "8px 10px",
      borderRadius: 7,
      border: "1px solid #e2e8f0",
      fontSize: 13,
      outline: "none",
      boxSizing: "border-box" as const,
      background: "#ffffff",
    };

    const mcqOptionInputStyle = {
      flex: 1,
      padding: "6px 8px",
      borderRadius: 6,
      border: "none",
      fontSize: 12,
      outline: "none",
      background: "transparent",
    };

    return (
      <div>
        {renderInstructions()}

        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
            Questions ({resolvedQuestions.length})
          </div>

          {resolvedQuestions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              style={{
                background: "#f8fafc",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 8,
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  Q{questionIndex + 1}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteQuestion(questionIndex)}
                    title="Delete question"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {canEdit ? (
                <input
                  value={question.text}
                  onChange={(e) => updateQuestion(questionIndex, { text: e.target.value })}
                  placeholder="Question text"
                  style={{ ...mcqInputStyle, marginBottom: 8 }}
                />
              ) : (
                <p style={{ fontSize: 13, color: "#004aad", marginBottom: 8, fontWeight: 500 }}>
                  {a(question.text)}
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Array.from({ length: MULTIPLE_CHOICE_OPTION_COUNT }, (_, optionIndex) => {
                  const selectedOption = evaluate?.mcqSelections?.[questionIndex] ?? null;
                  const isSelected = evaluate ? selectedOption === optionIndex : false;
                  const isCorrect = !evaluate && question.correct === optionIndex;
                  const isHighlighted = evaluate ? isSelected : isCorrect;

                  return (
                    <label
                      key={optionIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px",
                        borderRadius: 6,
                        background: isHighlighted ? "#ecfdf5" : "#ffffff",
                        border: `1px solid ${isHighlighted ? "#a7f3d0" : "#e2e8f0"}`,
                        cursor: evaluate ? "pointer" : canEdit ? "default" : "default",
                      }}
                    >
                      <input
                        type="radio"
                        name={`template-${template.id}-q${questionIndex}`}
                        checked={evaluate ? isSelected : isCorrect}
                        disabled={!canEdit && !evaluate}
                        onChange={() => {
                          if (canEdit) {
                            updateQuestion(questionIndex, { correct: optionIndex });
                          } else if (evaluate) {
                            evaluate.onMcqSelectionChange(questionIndex, optionIndex);
                          }
                        }}
                        title={canEdit ? "Mark as correct answer" : undefined}
                        style={{ cursor: evaluate || canEdit ? "pointer" : "default" }}
                      />
                      <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      {canEdit ? (
                        <input
                          value={question.options[optionIndex] ?? ""}
                          onChange={(e) =>
                            updateQuestionOption(questionIndex, optionIndex, e.target.value)
                          }
                          placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                          style={{
                            ...mcqOptionInputStyle,
                            color: isCorrect ? "#059669" : "#374151",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            flex: 1,
                            color: isHighlighted ? "#059669" : "#374151",
                          }}
                        >
                          {a(question.options[optionIndex] ?? "")}
                        </span>
                      )}
                      {isHighlighted && !evaluate && (
                        <CheckSquare size={11} color="#059669" style={{ flexShrink: 0 }} />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {canEdit && (
            <button
              type="button"
              onClick={addQuestion}
              style={{
                marginTop: 8,
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                background: "#3b82f6",
                color: "white",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              + Add Question
            </button>
          )}
        </div>
      </div>
    );
  }

  if (template.format === "letter_grid") {
    const sections = resolvedDraft.sections as LetterGridSection[];
    let letterOffset = 0;

    return (
      <div>
        {renderInstructions()}

        {sections.map((section, sectionIndex) => {
          const sectionOffset = letterOffset;
          letterOffset += section.letters.length;

          return (
          <div key={`${section.titleFr}-${sectionIndex}`}>
            {canEdit ? (
              <input
                value={section.titleFr}
                onChange={(e) => updateLetterSection(sectionIndex, { titleFr: e.target.value })}
                className="text-lg mb-4 font-semibold"
                style={{ ...editableInputStyle, fontWeight: 600, marginBottom: 16 }}
              />
            ) : (
              <h3 className="text-lg mb-4" style={{ color: "#004aad" }}>{a(section.titleFr)}</h3>
            )}
            <div className="rounded-xl border" style={{ borderColor: "#dff3ff" }}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#38b6ff" }}>
                    <th className="px-3 py-2 text-left text-sm" style={{ color: "#ffffff" }}>{t("evaluation.letter")}</th>
                    {section.columns.includes("name") && (
                      <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.nameCol")}</th>
                    )}
                    {section.columns.includes("sound") && (
                      <th className="px-3 py-2 text-center text-sm" style={{ color: "#ffffff" }}>{t("evaluation.soundCol")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {section.letters.map((letter, rowIndex) => {
                    const markIndex = sectionOffset + rowIndex;
                    return (
                    <tr key={letter} className="border-b" style={{ borderColor: "#dff3ff" }}>
                      <td className="px-3 py-2 font-bold text-lg" style={{ color: "#004aad" }}>{letter}</td>
                      {section.columns.includes("name") && (
                        <td className="px-3 py-2 text-center">
                          {evaluate ? (
                            <InteractiveMarkPair
                              marks={evaluate.letterName}
                              rowIndex={markIndex}
                              onChange={evaluate.onLetterNameChange}
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <PreviewMarkButton variant="empty" />
                              <PreviewMarkButton variant="empty" />
                            </div>
                          )}
                        </td>
                      )}
                      {section.columns.includes("sound") && (
                        <td className="px-3 py-2 text-center">
                          {evaluate ? (
                            <InteractiveMarkPair
                              marks={evaluate.letterSound}
                              rowIndex={markIndex}
                              onChange={evaluate.onLetterSoundChange}
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <PreviewMarkButton variant="empty" />
                              <PreviewMarkButton variant="empty" />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  if (template.format === "word_sound_list") {
    const sections = resolvedDraft.sections as WordSoundListSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="grid grid-cols-2 gap-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{ background: "#dff3ff" }}
            >
              {canEdit ? (
                <input
                  value={section.titleFr}
                  onChange={(e) => updateWordSoundSection(sectionIndex, { titleFr: e.target.value })}
                  className="text-base mb-4 font-bold"
                  style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 16 }}
                />
              ) : (
                <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>
                  {a(section.titleFr)}
                </h3>
              )}
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-3 mb-3">
                  {canEdit ? (
                    <>
                      <input
                        value={item.word}
                        onChange={(e) => updateWordSoundItem(sectionIndex, itemIndex, "word", e.target.value)}
                        className="text-sm font-medium"
                        style={{ ...editableInputStyle, width: 80, fontWeight: 500 }}
                      />
                      <input
                        value={item.sound}
                        onChange={(e) => updateWordSoundItem(sectionIndex, itemIndex, "sound", e.target.value)}
                        className="text-xs"
                        style={{
                          ...editableInputStyle,
                          width: 56,
                          fontSize: 12,
                          textAlign: "center",
                          background: "#f0f0f0",
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span className="text-sm w-20 font-medium" style={{ color: "#004aad" }}>
                        {a(item.word)}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: "#f0f0f0", color: "#666" }}
                      >
                        {item.sound}
                      </span>
                    </>
                  )}
                  {renderCheckbox()}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.format === "item_grid_sections") {
    const sections = resolvedDraft.sections as ItemGridSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{ background: itemGridSectionBackground(section.variant) }}
            >
              {canEdit ? (
                <>
                  <input
                    value={section.titleFr}
                    onChange={(e) => updateItemGridSection(sectionIndex, { titleFr: e.target.value })}
                    className="text-base mb-3 font-bold"
                    style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                  />
                  <textarea
                    value={section.promptFr}
                    onChange={(e) => updateItemGridSection(sectionIndex, { promptFr: e.target.value })}
                    rows={2}
                    className="text-sm mb-3"
                    style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>
                    {a(section.titleFr)}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
                </>
              )}
              <div className="grid grid-cols-5 gap-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg"
                    style={{ background: "#ffffff" }}
                  >
                    {canEdit ? (
                      <input
                        value={item}
                        onChange={(e) => updateItemGridItem(sectionIndex, itemIndex, e.target.value)}
                        className="text-base font-semibold text-center"
                        style={{ ...editableInputStyle, fontWeight: 600, width: 88 }}
                      />
                    ) : (
                      <span className="text-base font-semibold" style={{ color: "#004aad" }}>{a(item)}</span>
                    )}
                    {renderCheckbox()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.format === "mixed_reading_sections") {
    const sections = resolvedDraft.sections as ReadingMixedSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{ background: itemGridSectionBackground(section.variant) }}
            >
              {canEdit ? (
                <>
                  <input
                    value={section.titleFr}
                    onChange={(e) => updateReadingMixedSection(sectionIndex, { titleFr: e.target.value })}
                    className="text-base mb-3 font-bold"
                    style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                  />
                  <textarea
                    value={section.promptFr}
                    onChange={(e) => updateReadingMixedSection(sectionIndex, { promptFr: e.target.value })}
                    rows={2}
                    className="text-sm mb-3"
                    style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>
                    {a(section.titleFr)}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
                </>
              )}

              {isWordFamilySection(section) ? (
                section.families.map((family, familyIndex) => (
                  <div
                    key={familyIndex}
                    className="flex items-center gap-3 mb-3 p-2 rounded"
                    style={{ background: "#ffffff" }}
                  >
                    {canEdit ? (
                      <input
                        value={family.join(", ")}
                        onChange={(e) => updateWordFamilyRow(sectionIndex, familyIndex, e.target.value)}
                        className="text-sm flex-1"
                        style={{ ...editableInputStyle, fontWeight: 500 }}
                      />
                    ) : (
                      <span className="text-sm flex-1" style={{ color: "#004aad" }}>
                        {family.map((word) => a(word)).join(", ")}
                      </span>
                    )}
                    {renderCheckbox()}
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex flex-col items-center gap-2 p-2 rounded"
                      style={{ background: "#ffffff" }}
                    >
                      {canEdit ? (
                        <input
                          value={item}
                          onChange={(e) => updateReadingGridItem(sectionIndex, itemIndex, e.target.value)}
                          className="text-sm font-semibold text-center"
                          style={{ ...editableInputStyle, fontWeight: 600, width: 88 }}
                        />
                      ) : (
                        <span className="text-sm font-semibold" style={{ color: "#004aad" }}>{a(item)}</span>
                      )}
                      {renderCheckbox()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.format === "fluency_sections") {
    const sections = resolvedDraft.sections as FluencyMixedSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{ background: itemGridSectionBackground(section.variant) }}
            >
              {canEdit ? (
                <>
                  <input
                    value={section.titleFr}
                    onChange={(e) => updateFluencyMixedSection(sectionIndex, { titleFr: e.target.value })}
                    className="text-base mb-3 font-bold"
                    style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                  />
                  <textarea
                    value={section.promptFr}
                    onChange={(e) => updateFluencyMixedSection(sectionIndex, { promptFr: e.target.value })}
                    rows={2}
                    className="text-sm mb-3"
                    style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>
                    {a(section.titleFr)}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
                </>
              )}

              {isSentenceReadingSection(section) ? (
                section.sentences.map((sentence, sentenceIndex) => (
                  <div
                    key={sentenceIndex}
                    className="mb-4 p-4 rounded-lg"
                    style={{ background: "#ffffff" }}
                  >
                    {canEdit ? (
                      <textarea
                        value={sentence}
                        onChange={(e) => updateSentenceText(sectionIndex, sentenceIndex, e.target.value)}
                        rows={2}
                        className="text-base mb-3 w-full"
                        style={{ ...editableTextareaStyle, color: "#004aad", fontWeight: 500, marginBottom: 12 }}
                      />
                    ) : (
                      <p className="text-base mb-3" style={{ color: "#004aad" }}>{a(sentence)}</p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      {section.criteria.map((criterion, criterionIndex) => (
                        <label key={criterion.key} className="flex items-center gap-2">
                          {renderCheckbox("w-4 h-4 rounded")}
                          {canEdit ? (
                            <input
                              value={criterion.labelFr}
                              onChange={(e) =>
                                updateSentenceCriterion(sectionIndex, criterionIndex, e.target.value)
                              }
                              className="text-xs"
                              style={{ ...editableInputStyle, width: 96, fontSize: 12, color: "#666" }}
                            />
                          ) : (
                            <span className="text-xs" style={{ color: "#666" }}>{a(criterion.labelFr)}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg"
                      style={{ background: "#ffffff" }}
                    >
                      {canEdit ? (
                        <input
                          value={item}
                          onChange={(e) => updateFluencyGridItem(sectionIndex, itemIndex, e.target.value)}
                          className="text-lg font-bold text-center"
                          style={{ ...editableInputStyle, fontWeight: 700, width: 88 }}
                        />
                      ) : (
                        <span className="text-lg font-bold" style={{ color: "#004aad" }}>{a(item)}</span>
                      )}
                      {renderCheckbox()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.format === "comprehension_sections") {
    const sections = resolvedDraft.sections as ComprehensionMixedSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{ background: itemGridSectionBackground(section.variant) }}
            >
              {canEdit ? (
                <input
                  value={section.titleFr}
                  onChange={(e) => updateComprehensionMixedSection(sectionIndex, { titleFr: e.target.value })}
                  className="text-base mb-3 font-bold"
                  style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                />
              ) : (
                <h3 className="text-base mb-3 font-bold" style={{ color: "#004aad" }}>
                  {a(section.titleFr)}
                </h3>
              )}

              {isPassageSection(section) ? (
                <>
                  {canEdit ? (
                    <textarea
                      value={section.promptFr}
                      onChange={(e) => updateComprehensionMixedSection(sectionIndex, { promptFr: e.target.value })}
                      rows={2}
                      className="text-sm mb-3 w-full"
                      style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                    />
                  ) : (
                    <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
                  )}
                  <div className="p-4 rounded leading-relaxed" style={{ background: "#ffffff" }}>
                    {canEdit ? (
                      <textarea
                        value={section.passageFr}
                        onChange={(e) =>
                          updateComprehensionMixedSection(sectionIndex, { passageFr: e.target.value })
                        }
                        rows={6}
                        className="text-sm w-full"
                        style={{ ...editableTextareaStyle, color: "#004aad", lineHeight: 1.6 }}
                      />
                    ) : (
                      <p className="text-sm" style={{ color: "#004aad" }}>{a(section.passageFr)}</p>
                    )}
                  </div>
                </>
              ) : (
                section.questions.map((item, questionIndex) => (
                  <div
                    key={questionIndex}
                    className="mb-3 p-3 rounded"
                    style={{ background: "#ffffff" }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {canEdit ? (
                        <input
                          value={item.questionFr}
                          onChange={(e) =>
                            updateComprehensionQuestion(
                              sectionIndex,
                              questionIndex,
                              "questionFr",
                              e.target.value
                            )
                          }
                          className="text-sm flex-1"
                          style={{ ...editableInputStyle, fontWeight: 500 }}
                        />
                      ) : (
                        <span className="text-sm flex-1" style={{ color: "#004aad" }}>
                          {a(item.questionFr)}
                        </span>
                      )}
                      {renderCheckbox("w-5 h-5 rounded flex-shrink-0 mt-0.5")}
                    </div>
                    {canEdit ? (
                      <input
                        value={item.answerFr}
                        onChange={(e) =>
                          updateComprehensionQuestion(
                            sectionIndex,
                            questionIndex,
                            "answerFr",
                            e.target.value
                          )
                        }
                        className="text-xs italic w-full"
                        style={{
                          ...editableInputStyle,
                          color: "#2e7d32",
                          marginLeft: 12,
                          fontStyle: "italic",
                        }}
                        placeholder="[Réponse: ...]"
                      />
                    ) : (
                      <p className="text-xs italic pl-3" style={{ color: "#2e7d32" }}>
                        {a("[Réponse:")} {a(item.answerFr)}]
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.format === "mixed_sections") {
    const sections = resolvedDraft.sections as MixedSection[];

    return (
      <div>
        {renderInstructions()}

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.titleFr}-${sectionIndex}`}
              className="p-5 rounded-xl"
              style={{
                background: isItemGridSection(section)
                  ? itemGridSectionBackground(section.variant)
                  : "#dff3ff",
              }}
            >
              {canEdit ? (
                <>
                  <input
                    value={section.titleFr}
                    onChange={(e) => updateMixedSection(sectionIndex, { titleFr: e.target.value })}
                    className="text-base mb-3 font-bold"
                    style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                  />
                  {"promptFr" in section && (
                    <textarea
                      value={section.promptFr}
                      onChange={(e) => updateMixedSection(sectionIndex, { promptFr: e.target.value })}
                      rows={2}
                      className="text-sm mb-3"
                      style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                    />
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>
                    {a(section.titleFr)}
                  </h3>
                  {"promptFr" in section && (
                    <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
                  )}
                </>
              )}

              {isItemGridSection(section) ? (
                <div className="grid grid-cols-5 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg"
                      style={{ background: "#ffffff" }}
                    >
                      {canEdit ? (
                        <input
                          value={item}
                          onChange={(e) => updateMixedItemGridItem(sectionIndex, itemIndex, e.target.value)}
                          className="text-lg font-bold text-center"
                          style={{ ...editableInputStyle, fontWeight: 700, width: 72 }}
                        />
                      ) : (
                        <span className="text-lg font-bold" style={{ color: "#004aad" }}>{a(item)}</span>
                      )}
                      {renderCheckbox()}
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#ffffff" }}>
                      {section.columns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-3 py-2 text-sm ${column.align === "center" ? "text-center" : "text-left"}`}
                          style={{ color: "#004aad", border: "1px solid #dff3ff" }}
                        >
                          {a(column.labelFr)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ borderBottom: "1px solid #dff3ff" }}>
                        {section.columns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-3 py-2 text-sm ${column.align === "center" ? "text-center" : "text-left"}`}
                            style={{
                              color: column.key === "passed" ? "#004aad" : primaryCellKeys.has(column.key) ? "#004aad" : "#666",
                              border: "1px solid #dff3ff",
                              fontWeight: primaryCellKeys.has(column.key) ? 500 : 400,
                            }}
                          >
                            {column.key === "passed" ? (
                              renderCheckbox()
                            ) : canEdit ? (
                              <input
                                value={String(row[column.key] ?? "")}
                                onChange={(e) => updateMixedRowCell(sectionIndex, rowIndex, column.key, e.target.value)}
                                style={{
                                  ...editableInputStyle,
                                  textAlign: column.align === "center" ? "center" : "left",
                                  fontWeight: primaryCellKeys.has(column.key) ? 500 : 400,
                                  color: column.key === "correct" ? "#2e7d32" : "#004aad",
                                }}
                              />
                            ) : (
                              <span style={{ color: column.key === "correct" ? "#2e7d32" : undefined, fontWeight: column.key === "correct" ? 700 : undefined }}>
                                {a(String(row[column.key] ?? ""))}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sections = resolvedDraft.sections as CheckboxTableSection[];

  return (
    <div>
      {renderInstructions()}

      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={`${section.titleFr}-${sectionIndex}`} className="p-5 rounded-xl" style={{ background: "#dff3ff" }}>
            {canEdit ? (
              <>
                <input
                  value={section.titleFr}
                  onChange={(e) => updateCheckboxSection(sectionIndex, { titleFr: e.target.value })}
                  className="text-base mb-3 font-bold"
                  style={{ ...editableInputStyle, fontWeight: 700, marginBottom: 12 }}
                />
                <textarea
                  value={section.promptFr}
                  onChange={(e) => updateCheckboxSection(sectionIndex, { promptFr: e.target.value })}
                  rows={2}
                  className="text-sm mb-3"
                  style={{ ...editableTextareaStyle, color: "#666", marginBottom: 12 }}
                />
              </>
            ) : (
              <>
                <h3 className="text-base mb-4 font-bold" style={{ color: "#004aad" }}>{a(section.titleFr)}</h3>
                <p className="text-sm mb-3" style={{ color: "#666" }}>{a(section.promptFr)}</p>
              </>
            )}
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#ffffff" }}>
                  {section.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2 text-sm ${column.align === "center" ? "text-center" : "text-left"}`}
                      style={{ color: "#004aad", border: "1px solid #dff3ff" }}
                    >
                      {a(column.labelFr)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: "1px solid #dff3ff" }}>
                    {section.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 text-sm ${column.align === "center" ? "text-center" : "text-left"}`}
                        style={{
                          color: column.key === "passed" ? "#004aad" : primaryCellKeys.has(column.key) ? "#004aad" : "#666",
                          border: "1px solid #dff3ff",
                          fontWeight: primaryCellKeys.has(column.key) ? 500 : 400,
                        }}
                      >
                        {column.key === "passed" ? (
                          renderCheckbox()
                        ) : canEdit ? (
                          <input
                            value={String(row[column.key] ?? "")}
                            onChange={(e) => updateRowCell(sectionIndex, rowIndex, column.key, e.target.value)}
                            style={{
                              ...editableInputStyle,
                              textAlign: column.align === "center" ? "center" : "left",
                              fontWeight: primaryCellKeys.has(column.key) ? 500 : 400,
                            }}
                          />
                        ) : (
                          a(String(row[column.key] ?? ""))
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
