import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { TeacherSidebar } from "../components/TeacherSidebar";
import { useLanguage } from "../i18n";

const resourceTitles: { [key: string]: string } = {
  "2": "Unité 1",
  "3": "Unité 2",
  "4": "Unité 3",
  "5": "Unité 4",
  "6": "Unité 5",
  "7": "Unité 6",
  "8": "Unité 7",
  "9": "Unité 8",
  "10": "Unité 9",
  "11": "Unité 10",
};

export function LessonsPage() {
  const navigate = useNavigate();
  const { resourceId } = useParams();
  const { t, tp, auto: a } = useLanguage();
  const resourceTitle = a(resourceTitles[resourceId || "2"]);

  const lessonCount = resourceId === "2" ? 13 : 10;
  const lessons = Array.from({ length: lessonCount }, (_, i) => i + 1);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      <TeacherSidebar active="library" />

      <div className="flex-1 p-12 overflow-y-auto">
        <div className="flex items-start justify-between mb-12">
          <div>
            <button
              onClick={() => navigate(`/resource/${resourceId}`)}
              className="flex items-center gap-2 mb-4 text-sm"
              style={{ color: "#38b6ff" }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("resource.backToOptions")}
            </button>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {resourceTitle} - {a("Leçons")}
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {t("resource.selectLessonPdf")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#38b6ff", color: "#ffffff" }}
            >
              MG
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {lessons.map((lessonNum) => (
            <button
              key={lessonNum}
              onClick={() =>
                console.log(`Opening PDF for ${tp("resource.lessonN", { n: lessonNum })}`)
              }
              className="rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "#dff3ff" }}
              >
                <FileText className="w-6 h-6" style={{ color: "#004aad" }} />
              </div>

              <h3 className="text-center" style={{ color: "#004aad" }}>
                {tp("resource.lessonN", { n: lessonNum })}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
