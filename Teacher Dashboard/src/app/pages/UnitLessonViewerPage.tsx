import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { init } from "pptx-preview";
import { SecurePdfViewer } from "../components/SecurePdfViewer";
import { teacherUnitsApi } from "../api/client";
import { useLanguage } from "../i18n";

function isPowerPoint(format: string) {
  return ["PPT", "PPTX"].includes(format.toUpperCase());
}

function isPdf(format: string) {
  return format.toUpperCase() === "PDF";
}

export function UnitLessonViewerPage() {
  const { resourceId, lessonNum } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const pptxContainerRef = useRef<HTMLDivElement>(null);
  const pptxViewerRef = useRef<ReturnType<typeof init> | null>(null);

  const [format, setFormat] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState("");

  const unitId = Number(resourceId);
  const lessonNumber = Number(lessonNum);
  const viewUrl =
    unitId && lessonNumber
      ? teacherUnitsApi.interactiveViewUrl(unitId, lessonNumber)
      : "";

  useEffect(() => {
    if (!unitId || !lessonNumber) {
      setViewerError("Invalid lesson.");
      setLoading(false);
      return;
    }

    teacherUnitsApi
      .get(unitId)
      .then(({ unit }) => {
        const lesson = unit.lessons?.find((l) => l.lesson_number === lessonNumber);
        if (!lesson?.has_interactive || !lesson.is_interactive_viewable) {
          setViewerError("This lesson is not available for interactive viewing.");
          return;
        }
        setFormat(lesson.interactive_format ?? "PDF");
        setTitle(`${unit.title} — Lesson ${lessonNumber}`);
      })
      .catch((err) => setViewerError(err instanceof Error ? err.message : "Failed to load lesson."))
      .finally(() => setLoading(false));
  }, [unitId, lessonNumber]);

  useEffect(() => {
    if (!format || !viewUrl || !isPowerPoint(format) || !pptxContainerRef.current) return;

    let cancelled = false;
    setViewerError("");

    const loadPresentation = async () => {
      try {
        pptxViewerRef.current?.destroy();
        pptxViewerRef.current = init(pptxContainerRef.current!, {
          width: window.innerWidth - 16,
          height: window.innerHeight - 140,
          mode: "slide",
        });

        const response = await fetch(viewUrl, { credentials: "include" });
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
    };
  }, [format, viewUrl]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0a1628" }}>
        <Loader2 className="animate-spin" size={24} color="white" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0a1628" }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <button
          onClick={() => navigate(`/resource/${resourceId}`)}
          className="flex items-center gap-2 text-sm"
          style={{ color: "#38b6ff" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("resource.backToOptions")}
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "#004aad" }}>{title}</h1>
        <div style={{ width: 80 }} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-2 pb-2">
        {viewerError ? (
          <div className="flex flex-1 items-center justify-center">
            <p style={{ color: "#fca5a5" }}>{viewerError}</p>
          </div>
        ) : isPdf(format) ? (
          <SecurePdfViewer url={viewUrl} title={title} />
        ) : isPowerPoint(format) ? (
          <div ref={pptxContainerRef} className="flex flex-1 items-center justify-center" />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p style={{ color: "#94a3b8" }}>Unsupported format.</p>
          </div>
        )}
      </div>
    </div>
  );
}
