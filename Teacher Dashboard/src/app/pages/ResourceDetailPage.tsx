import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Book, Download, Loader2 } from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { teacherUnitsApi, type PedagogicalUnitItem } from "../api/client";

function formatAtelierLabel(numbers: number[]): string {
  if (numbers.length === 0) return "";
  if (numbers.length === 1) return `Atelier ${numbers[0]}`;
  return `Ateliers ${numbers.join(", ")}`;
}

export function ResourceDetailPage() {
  const navigate = useNavigate();
  const { resourceId } = useParams();
  const { t, tp, auto: a } = useLanguage();
  const [unit, setUnit] = useState<PedagogicalUnitItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(resourceId);
    if (!id) {
      setError("Invalid unit.");
      setLoading(false);
      return;
    }

    teacherUnitsApi
      .get(id)
      .then(({ unit: data }) => setUnit(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load unit."))
      .finally(() => setLoading(false));
  }, [resourceId]);

  const unitColor = unit?.color ?? "#3b82f6";
  const lessons = unit?.lessons ?? [];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#dff3ff" }}>
        <Loader2 className="animate-spin" size={24} color="#004aad" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#be123c" }}>{error || "Unit not found."}</p>
        <button onClick={() => navigate("/library")} style={{ color: "#004aad" }}>Back to library</button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden" style={{ background: `${unitColor}15` }}>
      <div className="h-full overflow-y-auto">
        <div className="p-12 pb-8" style={{ background: "#ffffff" }}>
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => navigate("/library")}
                className="flex items-center gap-2 mb-4 text-sm"
                style={{ color: "#38b6ff" }}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("resource.backToLibrary")}
              </button>
              <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
                {a(unit.title)}
              </h1>
              {unit.atelier_numbers.length > 0 && (
                <div
                  className="inline-block px-4 py-2 rounded-xl mb-3"
                  style={{ background: "#f7ffd6", border: "1px solid #c9e265" }}
                >
                  <p style={{ color: "#004aad" }}>
                    {a(formatAtelierLabel(unit.atelier_numbers))}
                  </p>
                </div>
              )}
              <p className="text-lg" style={{ color: "#000000" }}>
                {t("resource.selectLesson")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <LangToggle className="" />
              <NotificationDropdown />
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "#38b6ff", color: "#ffffff" }}
              >
                MG
              </div>
            </div>
          </div>
        </div>

        <div className="p-12 pt-8">
          <div className="grid grid-cols-4 gap-4 max-w-5xl">
            {lessons.map((lesson) => (
              <details
                key={lesson.lesson_number}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: "#ffffff",
                  border: `2px solid ${unitColor}30`,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                }}
              >
                <summary
                  className="px-4 py-3 cursor-pointer flex items-center justify-between transition-all list-none"
                  style={{ background: `${unitColor}15` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: unitColor, color: unit.text_color }}
                    >
                      {lesson.lesson_number}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "#004aad" }}>
                      {tp("resource.lessonN", { n: lesson.lesson_number })}
                    </span>
                  </div>
                </summary>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() =>
                      lesson.has_interactive && lesson.is_interactive_viewable
                        ? navigate(`/resource/${unit.id}/lesson/${lesson.lesson_number}/interactive`)
                        : undefined
                    }
                    disabled={!lesson.has_interactive || !lesson.is_interactive_viewable}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: `${unitColor}08`,
                      border: `1px solid ${unitColor}20`,
                      color: "#004aad",
                    }}
                  >
                    <Book className="w-4 h-4" style={{ color: unitColor }} />
                    {t("resource.interactiveLesson")}
                  </button>
                  <button
                    onClick={() => {
                      if (lesson.has_activity_sheet) {
                        window.open(
                          teacherUnitsApi.activitySheetDownloadUrl(unit.id, lesson.lesson_number),
                          "_blank"
                        );
                      }
                    }}
                    disabled={!lesson.has_activity_sheet}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: `${unitColor}08`,
                      border: `1px solid ${unitColor}20`,
                      color: "#004aad",
                    }}
                  >
                    <Download className="w-4 h-4" style={{ color: unitColor }} />
                    {a("Fiche d'activité associée")}
                  </button>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
