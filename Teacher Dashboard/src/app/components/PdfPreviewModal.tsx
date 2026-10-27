import { Download, Loader2, Printer, X } from "lucide-react";
import { useLanguage } from "../i18n";

export function PdfPreviewModal({
  open,
  title,
  url,
  fileName,
  loading = false,
  error = "",
  onClose,
}: {
  open: boolean;
  title: string;
  url: string | null;
  fileName: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  if (!open) return null;

  const handlePrint = () => {
    if (!url) return;
    const frame = document.getElementById("pdf-preview-frame") as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,40,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#ffffff", height: "90vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#dff3ff" }}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate" style={{ color: "#004aad" }}>
              {title}
            </h2>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              {fileName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!url}
              className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm disabled:opacity-50"
              style={{ background: "#ffffff", border: "1px solid #dff3ff", color: "#004aad" }}
            >
              <Printer className="w-4 h-4" />
              {t("pdfPreview.print")}
            </button>
            <a
              href={url ?? undefined}
              download={fileName}
              aria-disabled={!url}
              className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
              style={{
                background: "#004aad",
                color: "#ffffff",
                pointerEvents: url ? "auto" : "none",
                opacity: url ? 1 : 0.5,
              }}
            >
              <Download className="w-4 h-4" />
              {t("pdfPreview.download")}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl"
              style={{ color: "#64748b" }}
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0" style={{ background: "#f1f5f9" }}>
          {loading && (
            <div
              className="h-full flex flex-col items-center justify-center gap-3"
              style={{ color: "#004aad" }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">{t("pdfPreview.generating")}</p>
            </div>
          )}
          {!loading && error && (
            <div className="h-full flex items-center justify-center px-8 text-center">
              <p className="text-sm" style={{ color: "#be123c" }}>
                {error}
              </p>
            </div>
          )}
          {!loading && !error && url && (
            <iframe
              id="pdf-preview-frame"
              title={title}
              src={url}
              className="w-full h-full"
              style={{ border: "none" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
