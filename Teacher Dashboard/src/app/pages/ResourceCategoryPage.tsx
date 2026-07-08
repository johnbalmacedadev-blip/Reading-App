import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { UserAvatar } from "../components/UserAvatar";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

const categoryColors: { [key: string]: string } = {
  "conscience-phonologique": "#3b82f6",
  "connaissance-alphabetique": "#38bdf8",
  "decodage": "#fbbf24",
  "fluidite": "#a855f7",
  "comprehension": "#0ea5e9",
};

const categoryTitles: { [key: string]: string } = {
  "conscience-phonologique": "Conscience phonologique",
  "connaissance-alphabetique": "Connaissance alphabétique",
  "decodage": "Décodage",
  "fluidite": "Fluidité",
  "comprehension": "Compréhension",
};

const resourceTitles: { [key: string]: string } = {
  "rimes": "Rimes",
  "segmentation": "Segmentation",
  "fusions": "Fusions",
  "sons-initiaux": "Sons initiaux",
  "sons-finaux": "Sons finaux",
  "syllabes": "Syllabes",
  "manipulation-de-phonemes": "Manipulation de phonèmes",
  "identification-de-sons": "Identification de sons",
  "comptage-de-syllabes": "Comptage de syllabes",
  "voyelles": "Voyelles",
  "consonnes": "Consonnes",
  "lecture-de-cv": "Lecture de CV",
  "lecture-vc": "Lecture VC",
  "lecture-cvc": "Lecture CVC",
  "fusion-phonemique": "Fusion phonémique",
  "syllabes-ouvertes": "Syllabes ouvertes",
  "syllabes-fermees": "Syllabes fermées",
  "mots-frequents": "Mots fréquents",
  "les-sons-complexes": "Les sons complexes",
  "familles-de-mots": "Familles de mots",
  "sons-muets": "Sons muets",
  "phrases-simples": "Phrases simples",
  "phrases-pyramides": "Phrases pyramides",
  "lecture-de-textes": "Lecture de textes",
  "pratique-de-fluidite": "Pratique de fluidité",
  "lecture-repetee": "Lecture répétée",
  "lecture-chronometree": "Lecture chronométrée",
  "comprehension-de-texte": "Compréhension de texte",
  "inference": "Inférence",
  "resume": "Résumé",
  "idees-principales": "Idées principales",
  "questions-litterales": "Questions littérales",
  "predictions": "Prédictions",
};

export function ResourceCategoryPage() {
  const navigate = useNavigate();
  const { category, resource } = useParams();
  const { t, tp, auto: a } = useLanguage();

  const categoryColor = categoryColors[category || "conscience-phonologique"];
  const categoryTitle = a(categoryTitles[category || "conscience-phonologique"]);
  const resourceTitle = a(resourceTitles[resource || "rimes"]);

  const activityDescriptions = [
    t("resource.activityBeginner"),
    t("resource.activityProgress"),
    t("resource.activityAdvanced"),
  ];

  const downloadableResources = [1, 2, 3].map((n) => ({
    id: n,
    title: `${resourceTitle} · ${tp("resource.activityN", { n })}`,
    description: activityDescriptions[n - 1],
    fileName: `${resource}_activite${n}.pdf`,
  }));

  const handleDownload = (fileName: string) => {
    console.log(`Downloading ${fileName}`);
  };

  return (
    <div className="h-screen overflow-hidden" style={{ background: `${categoryColor}15` }}>
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
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: categoryColor }}
                >
                  <Download className="w-6 h-6" style={{ color: "#ffffff" }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "#666" }}>
                    {categoryTitle}
                  </p>
                  <h1 className="text-3xl" style={{ color: "#004aad" }}>
                    {resourceTitle}
                  </h1>
                </div>
              </div>
              <p className="text-lg" style={{ color: "#000000" }}>
                {a("Sélectionnez une ressource à télécharger")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <LangToggle className="" />
              <NotificationDropdown />
              <UserAvatar />
            </div>
          </div>
        </div>

        <div className="p-12 pt-8">
          <div className="grid grid-cols-1 gap-4 max-w-3xl">
            {downloadableResources.map((item) => (
              <button
                key={item.id}
                onClick={() => handleDownload(item.fileName)}
                className="rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl text-left flex items-center justify-between group"
                style={{
                  background: "#ffffff",
                  border: `2px solid ${categoryColor}30`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${categoryColor}05`;
                  e.currentTarget.style.borderColor = categoryColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = `${categoryColor}30`;
                }}
              >
                <div>
                  <h3 className="text-lg mb-1 font-semibold" style={{ color: "#004aad" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#666" }}>
                    {item.description}
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                  style={{
                    background: `${categoryColor}15`,
                    color: categoryColor,
                  }}
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-semibold">{t("common.download")}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
