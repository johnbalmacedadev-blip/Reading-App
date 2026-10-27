import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

type ExportPdfOptions = {
  orientation?: "p" | "l";
  backgroundColor?: string;
  fileSuffix?: string;
};

/**
 * Elements marked `data-pdf-hide` are dropped from the capture, and elements marked
 * `data-pdf-only` are revealed for it, so a screen layout can produce a print-ready sheet.
 */
async function buildPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {},
): Promise<jsPDF> {
  const { orientation = "p", backgroundColor = "#dff3ff" } = options;

  // Expand overflow so wide tables are captured fully.
  const overflowTargets: Array<{ el: HTMLElement; overflow: string; overflowX: string }> = [];
  element.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.overflowX === "auto" || style.overflowX === "scroll" || style.overflow === "auto") {
      overflowTargets.push({
        el,
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
      });
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
    }
  });

  const toggled: Array<{ el: HTMLElement; display: string }> = [];
  element.querySelectorAll<HTMLElement>("[data-pdf-hide]").forEach((el) => {
    toggled.push({ el, display: el.style.display });
    el.style.display = "none";
  });
  element.querySelectorAll<HTMLElement>("[data-pdf-only]").forEach((el) => {
    toggled.push({ el, display: el.style.display });
    el.style.display = "block";
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor,
      logging: false,
      windowWidth: Math.max(element.scrollWidth, element.clientWidth),
      windowHeight: Math.max(element.scrollHeight, element.clientHeight),
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF(orientation, "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf;
  } finally {
    overflowTargets.forEach(({ el, overflow, overflowX }) => {
      el.style.overflow = overflow;
      el.style.overflowX = overflowX;
    });
    toggled.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
}

export async function exportElementToPdf(
  element: HTMLElement,
  title: string,
  options: ExportPdfOptions = {},
): Promise<void> {
  const pdf = await buildPdf(element, options);
  const baseName = sanitizeFileName(title) || "report";
  pdf.save(`${baseName}-${options.fileSuffix ?? "rapport"}.pdf`);
}

export type PdfDocument = {
  url: string;
  fileName: string;
  revoke: () => void;
};

/**
 * Render an element to an in-memory PDF that can be previewed in an iframe and downloaded.
 */
export async function renderElementToPdfDocument(
  element: HTMLElement,
  title: string,
  options: ExportPdfOptions = {},
): Promise<PdfDocument> {
  const pdf = await buildPdf(element, options);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const baseName = sanitizeFileName(title) || "document";

  return {
    url,
    fileName: `${baseName}-${options.fileSuffix ?? "document"}.pdf`,
    revoke: () => URL.revokeObjectURL(url),
  };
}

export async function exportStudentReportPdf(
  element: HTMLElement,
  studentName: string,
): Promise<void> {
  await exportElementToPdf(element, studentName, {
    orientation: "p",
    backgroundColor: "#dff3ff",
    fileSuffix: "rapport",
  });
}

export async function exportWorkshopReportPdf(
  element: HTMLElement,
  className: string,
): Promise<void> {
  await exportElementToPdf(element, className, {
    orientation: "l",
    backgroundColor: "#dff3ff",
    fileSuffix: "atelier-rapport",
  });
}
