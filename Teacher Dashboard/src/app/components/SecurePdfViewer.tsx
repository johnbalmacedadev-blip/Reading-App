import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CONTROLS_HEIGHT = 72;

type SecurePdfViewerProps = {
  url: string;
  title: string;
};

function isRenderCancelled(err: unknown) {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("cancel") ||
    message.includes("same canvas") ||
    err.name === "RenderingCancelledException"
  );
}

export function SecurePdfViewer({ url, title }: SecurePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderGenRef = useRef(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    let frame = 0;
    const updateSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = viewportEl.clientWidth;
        const height = viewportEl.clientHeight;
        setViewportSize((prev) => {
          if (
            Math.abs(prev.width - width) < 2 &&
            Math.abs(prev.height - height) < 2
          ) {
            return prev;
          }
          return { width, height };
        });
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportEl);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [loading, error]);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      setError("");
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;

      try {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Could not load PDF file.");

        const buffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const viewportEl = viewportRef.current;
    if (
      loading ||
      !pdf ||
      !canvas ||
      !viewportEl ||
      totalPages <= 0 ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0
    ) {
      return;
    }

    const gen = ++renderGenRef.current;
    let active = true;

    const drawPage = async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      setRendering(true);
      try {
        const page = await pdf.getPage(currentPage);
        if (!active || gen !== renderGenRef.current) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const availWidth = viewportEl.clientWidth;
        const availHeight = viewportEl.clientHeight;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          availWidth / baseViewport.width,
          availHeight / baseViewport.height
        );
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (!active || gen !== renderGenRef.current) return;
      } catch (err) {
        if (!active || gen !== renderGenRef.current || isRenderCancelled(err)) return;
        setError(err instanceof Error ? err.message : "Could not render page.");
      } finally {
        if (active && gen === renderGenRef.current) {
          setRendering(false);
          renderTaskRef.current = null;
        }
      }
    };

    drawPage();

    return () => {
      active = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [loading, totalPages, currentPage, viewportSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setCurrentPage((p) => Math.min(totalPages, p + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [totalPages]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="animate-spin" size={28} color="#38b6ff" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p style={{ color: "#fca5a5" }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={viewportRef}
        className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden"
      >
        <div
          className="relative overflow-hidden rounded-lg shadow-2xl"
          style={{ background: "#ffffff", lineHeight: 0 }}
        >
          <canvas
            ref={canvasRef}
            aria-label={title}
            style={{ display: "block", userSelect: "none" }}
          />
          {rendering && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <Loader2 className="animate-spin" size={24} color="#004aad" />
            </div>
          )}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center justify-center gap-4 px-6 py-3"
        style={{ height: CONTROLS_HEIGHT, background: "rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1 || rendering}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: "#004aad", color: "#ffffff" }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="text-sm font-medium" style={{ color: "#ffffff", minWidth: 100, textAlign: "center" }}>
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages || rendering}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: "#004aad", color: "#ffffff" }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
