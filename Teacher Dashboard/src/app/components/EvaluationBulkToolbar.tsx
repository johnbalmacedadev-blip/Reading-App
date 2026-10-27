import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
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
  onSupportPdf,
  supportPdfBusy = false,
  onAccompanimentPdf,
  accompanimentPdfBusy = false,
  accompanimentPdfAvailable = false,
}: {
  unitNumber: number;
  unitColor: UnitColor;
  actions: EvaluationBulkAction[];
  onAllPassed?: () => void;
  onAllFailed?: () => void;
  onClearAll?: () => void;
  onSupportPdf?: () => void;
  supportPdfBusy?: boolean;
  onAccompanimentPdf?: () => void;
  accompanimentPdfBusy?: boolean;
  accompanimentPdfAvailable?: boolean;
}) {
  const { t, tp } = useLanguage();
  const [supportPdfHover, setSupportPdfHover] = useState(false);
  const [accompanimentHover, setAccompanimentHover] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6" data-pdf-hide>
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
        style={{ background: unitColor.bg }}
      >
        <span className="text-xs font-semibold" style={{ color: unitColor.text }}>
          {tp("tracking.unit", { n: unitNumber })}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap justify-end">
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
        {actions.includes("support_pdf") && onSupportPdf && (
          <button
            type="button"
            onClick={onSupportPdf}
            disabled={supportPdfBusy}
            onMouseEnter={() => setSupportPdfHover(true)}
            onMouseLeave={() => setSupportPdfHover(false)}
            className="px-4 py-2 text-sm flex items-center gap-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              color: supportPdfHover && !supportPdfBusy ? "#004aad" : "#38b6ff",
              background: supportPdfHover && !supportPdfBusy ? "#dff3ff" : "transparent",
              textDecoration: supportPdfHover && !supportPdfBusy ? "underline" : "none",
              cursor: supportPdfBusy ? "not-allowed" : "pointer",
            }}
          >
            {supportPdfBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {t("evaluation.supportPdf")}
          </button>
        )}
        {onAccompanimentPdf && accompanimentPdfAvailable && (
          <button
            type="button"
            onClick={onAccompanimentPdf}
            disabled={accompanimentPdfBusy}
            onMouseEnter={() => setAccompanimentHover(true)}
            onMouseLeave={() => setAccompanimentHover(false)}
            className="px-4 py-2 text-sm flex items-center gap-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              color: accompanimentHover && !accompanimentPdfBusy ? "#047857" : "#059669",
              background: accompanimentHover && !accompanimentPdfBusy ? "#ecfdf5" : "transparent",
              textDecoration: accompanimentHover && !accompanimentPdfBusy ? "underline" : "none",
              cursor: accompanimentPdfBusy ? "not-allowed" : "pointer",
              border: "1px solid #a7f3d0",
            }}
          >
            {accompanimentPdfBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {t("evaluation.accompanimentPdf")}
          </button>
        )}
      </div>
    </div>
  );
}
