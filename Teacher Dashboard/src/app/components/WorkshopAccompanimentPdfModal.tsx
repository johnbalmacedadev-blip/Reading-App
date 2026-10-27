import { useEffect, useState } from "react";
import { Eye, FileText, Loader2, X } from "lucide-react";
import { useLanguage } from "../i18n";
import { teacherApi, type TeacherAtelierFile } from "../api/client";

export function WorkshopAccompanimentPdfModal({
  open,
  atelier,
  grade,
  files,
  onClose,
}: {
  open: boolean;
  atelier: number;
  grade: string;
  files: TeacherAtelierFile[];
  onClose: () => void;
}) {
  const { t, tp } = useLanguage();
  const pdfs = files.filter((f) => f.type === "pdf");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setActiveId(null);
      setError("");
      setLoading(false);
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    if (pdfs.length === 1) {
      void loadPdf(pdfs[0]);
    }
  }, [open, atelier, grade, pdfs.map((f) => f.id).join(",")]);

  const loadPdf = async (file: TeacherAtelierFile) => {
    setActiveId(file.id);
    setLoading(true);
    setError("");
    try {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const blobUrl = await teacherApi.viewAtelierFile(file.id, atelier, grade);
      setUrl(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pdfPreview.failed"));
      setUrl(null);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const active = pdfs.find((f) => f.id === activeId) ?? null;

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
              {t("evaluation.accompanimentPdfTitle")}
            </h2>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              {tp("evaluation.workshopN", { n: atelier })}
              {active ? ` · ${active.name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{ color: "#64748b" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {pdfs.length > 1 && (
            <div
              className="w-64 flex-shrink-0 border-r overflow-y-auto p-3"
              style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
            >
              {pdfs.map((file) => {
                const selected = file.id === activeId;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => void loadPdf(file)}
                    className="w-full text-left px-3 py-2.5 rounded-lg mb-2 text-sm flex items-start gap-2"
                    style={{
                      background: selected ? "#dff3ff" : "#ffffff",
                      border: selected ? "1px solid #38b6ff" : "1px solid #e2e8f0",
                      color: "#0a1628",
                    }}
                  >
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#004aad" }} />
                    <span className="min-w-0">
                      <span className="block font-medium leading-snug break-words">{file.name}</span>
                      <span className="block text-xs mt-1" style={{ color: "#94a3b8" }}>{file.size}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {pdfs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-sm" style={{ color: "#64748b" }}>
                {t("evaluation.accompanimentPdfEmpty")}
              </div>
            ) : pdfs.length > 1 && !activeId && !loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-sm" style={{ color: "#64748b" }}>
                <Eye className="w-8 h-8" style={{ color: "#94a3b8" }} />
                {t("evaluation.accompanimentPdfOpen")}
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center gap-2" style={{ color: "#64748b" }}>
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-8 text-sm" style={{ color: "#be123c" }}>
                {error}
              </div>
            ) : url ? (
              <iframe
                title={active?.name || "PDF"}
                src={url}
                className="flex-1 w-full border-0"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
