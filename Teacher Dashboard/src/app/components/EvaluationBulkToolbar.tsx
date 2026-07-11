import { useLanguage } from "../i18n";

export type EvaluationBulkAction = "all_passed" | "all_failed" | "clear_all" | "support_pdf";

export const CHECKBOX_BULK_ACTIONS: EvaluationBulkAction[] = [
  "all_passed",
  "all_failed",
  "clear_all",
  "support_pdf",
];

export const LETTER_MARK_BULK_ACTIONS: EvaluationBulkAction[] = [
  "all_passed",
  "all_failed",
  "clear_all",
  "support_pdf",
];

type UnitColor = { bg: string; text: string };

export function EvaluationBulkToolbar({
  unitNumber,
  unitColor,
  actions,
  onAllPassed,
  onAllFailed,
  onClearAll,
}: {
  unitNumber: number;
  unitColor: UnitColor;
  actions: EvaluationBulkAction[];
  onAllPassed?: () => void;
  onAllFailed?: () => void;
  onClearAll?: () => void;
}) {
  const { t, tp } = useLanguage();

  return (
    <div className="flex items-center justify-between mb-6">
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
        style={{ background: unitColor.bg }}
      >
        <span className="text-xs font-semibold" style={{ color: unitColor.text }}>
          {tp("tracking.unit", { n: unitNumber })}
        </span>
      </div>
      <div className="flex gap-2">
        {actions.includes("all_passed") && onAllPassed && (
          <button
            type="button"
            onClick={onAllPassed}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#2e7d32", color: "#ffffff" }}
          >
            ✓ {t("evaluation.allPassed")}
          </button>
        )}
        {actions.includes("all_failed") && onAllFailed && (
          <button
            type="button"
            onClick={onAllFailed}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#d32f2f", color: "#ffffff" }}
          >
            ✗ {t("evaluation.allFailed")}
          </button>
        )}
        {actions.includes("clear_all") && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: "#666", color: "#ffffff" }}
          >
            {t("evaluation.clearAll")}
          </button>
        )}
        {actions.includes("support_pdf") && (
          <a href="#" className="px-4 py-2 text-sm flex items-center" style={{ color: "#38b6ff" }}>
            📄 {t("evaluation.supportPdf")}
          </a>
        )}
      </div>
    </div>
  );
}
