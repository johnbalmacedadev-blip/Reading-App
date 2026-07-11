import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { init } from "pptx-preview";
import { teacherLibraryApi, type LibraryContentItem } from "../api/client";
import { useLanguage } from "../i18n";

function isPowerPoint(format: string) {
  return ["PPT", "PPTX"].includes(format.toUpperCase());
}

function isPdf(format: string) {
  return format.toUpperCase() === "PDF";
}

export function ContentViewerPage() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const { t, tp } = useLanguage();
  const pptxContainerRef = useRef<HTMLDivElement>(null);
  const pptxViewerRef = useRef<ReturnType<typeof init> | null>(null);

  const [content, setContent] = useState<LibraryContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState("");

  useEffect(() => {
    const id = Number(contentId);
    if (!id) {
      setLoading(false);
      setViewerError("Invalid content.");
      return;
    }

    teacherLibraryApi
      .get(id)
      .then(({ content: item }) => {
        if (!item.is_viewable) {
          setViewerError(t("library.downloadOnly"));
        }
        setContent(item);
      })
      .catch((err) => setViewerError(err instanceof Error ? err.message : "Failed to load content."))
      .finally(() => setLoading(false));
  }, [contentId]);

  useEffect(() => {
    if (!content || !content.is_viewable || !isPowerPoint(content.format) || !pptxContainerRef.current) return;

    let cancelled = false;
    setViewerError("");

    const loadPresentation = async () => {
      try {
        pptxViewerRef.current?.destroy();
        pptxViewerRef.current = init(pptxContainerRef.current!, {
          width: Math.min(960, window.innerWidth - 80),
          height: Math.min(540, window.innerHeight - 220),
          mode: "slide",
        });

        const response = await fetch(teacherLibraryApi.viewUrl(content.id), {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Could not load presentation file.");
        const buffer = await response.arrayBuffer();
        if (!cancelled) {
          await pptxViewerRef.current.preview(buffer);
        }
      } catch (err) {
        if (!cancelled) {
          setViewerError(err instanceof Error ? err.message : "Could not display presentation.");
        }
      }
    };

    loadPresentation();

    return () => {
      cancelled = true;
      pptxViewerRef.current?.destroy();
      pptxViewerRef.current = null;
    };
  }, [content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: "#64748b" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          {t("library.loadingContent")}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#64748b" }}>{viewerError || t("library.contentNotFound")}</p>
        <button
          onClick={() => navigate("/library")}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#004aad", color: "#fff" }}
        >
          {t("library.backToLibrary")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#dff3ff" }}>
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "#fff", borderBottom: "1px solid #dff3ff" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ color: "#004aad", background: "#dff3ff" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("library.backToLibrary")}
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#004aad" }}>{content.title}</h1>
            <p className="text-xs" style={{ color: "#64748b" }}>
              {content.type} • {content.unit}{content.atelier > 0 ? ` • ${tp("evaluation.workshopN", { n: content.atelier })}` : ""}
            </p>
          </div>
        </div>
        <a
          href={teacherLibraryApi.downloadUrl(content.id)}
          download
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "#004aad", color: "#fff" }}
        >
          <Download className="w-4 h-4" />
          {t("library.download")}
        </a>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center">
        {viewerError && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "#fff1f2", color: "#be123c" }}>
            {viewerError}
          </div>
        )}

        {content.is_viewable && isPdf(content.format) && (
          <iframe
            title={content.title}
            src={teacherLibraryApi.viewUrl(content.id)}
            className="w-full rounded-2xl shadow-lg"
            style={{ height: "calc(100vh - 140px)", background: "#fff", border: "1px solid #e2e8f0" }}
          />
        )}

        {content.is_viewable && isPowerPoint(content.format) && (
          <div
            className="rounded-2xl shadow-lg overflow-auto"
            style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 16, maxWidth: "100%" }}
          >
            <div ref={pptxContainerRef} />
          </div>
        )}

        {!content.is_viewable && (
          <div className="text-center py-20" style={{ color: "#64748b" }}>
            <p className="mb-4">{t("library.downloadOnly")}</p>
            <a
              href={teacherLibraryApi.downloadUrl(content.id)}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#004aad", color: "#fff" }}
            >
              <Download className="w-4 h-4" />
              {t("library.download")}
            </a>
          </div>
        )}

        {content.is_viewable && !isPdf(content.format) && !isPowerPoint(content.format) && (
          <div className="text-center py-20" style={{ color: "#64748b" }}>
            <p className="mb-4">{t("library.previewNotAvailable")}</p>
            <a
              href={teacherLibraryApi.downloadUrl(content.id)}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#004aad", color: "#fff" }}
            >
              <Download className="w-4 h-4" />
              {t("library.download")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
