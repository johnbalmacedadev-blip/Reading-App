import { useNavigate } from "react-router";
import {
  BookOpen, LogOut, ArrowLeft, Edit2,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { boardNavItems } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";

const ateliers = [
  // Unité 1: Ateliers 1-6
  { num: 1, title: "Lettres majuscules (nom et son)", section: "unite1", color: "#3b82f6", unit: 1 },
  { num: 2, title: "Lettres minuscules (nom et son)", section: "unite1", color: "#3b82f6", unit: 1 },
  { num: 3, title: "Formation des lettres majuscules", section: "unite1", color: "#3b82f6", unit: 1 },
  { num: 4, title: "Formation des lettres minuscules", section: "unite1", color: "#3b82f6", unit: 1 },
  { num: 5, title: "Rimes et syllabes", section: "unite1", color: "#3b82f6", unit: 1 },
  { num: 6, title: "Identification des sons initiaux et finaux", section: "unite1", color: "#3b82f6", unit: 1 },
  // Unité 2: Atelier 7
  { num: 7, title: "Lecture de syllabes simples et correspondance son-lettre", section: "unite2", color: "#38bdf8", unit: 2 },
  // Unité 3: Atelier 8
  { num: 8, title: "Lecture de syllabes ouvertes, fermées et complexes", section: "unite3", color: "#22d3ee", unit: 3 },
  // Unité 4: Atelier 9
  { num: 9, title: "Lecture de mots usuels", section: "unite4", color: "#a3e635", unit: 4 },
  // Unité 5: Atelier 10
  { num: 10, title: "Lecture de graphèmes complexes", section: "unite5", color: "#fbbf24", unit: 5 },
  // Unité 6: Atelier 11
  { num: 11, title: "Familles de mots et terminaisons fréquentes", section: "unite6", color: "#fb923c", unit: 6 },
  // Unité 7: Atelier 12
  { num: 12, title: "Lecture répétée de phrases", section: "unite7", color: "#fb7185", unit: 7 },
  // Unité 8: Atelier 13
  { num: 13, title: "Lecture de graphèmes avancés", section: "unite8", color: "#a855f7", unit: 8 },
  // Unité 9: Atelier 14
  { num: 14, title: "Lecture et compréhension de texte court", section: "unite9", color: "#0ea5e9", unit: 9 },
  // Unité 10: Atelier 15
  { num: 15, title: "Lecture autonome et compréhension", section: "unite10", color: "#ef4444", unit: 10 },
];

export function AtelierManagementPage() {
  const navigate = useNavigate();
  const { t, tp, auto: a } = useLanguage();
  const handleLogout = usePortalLogout();

  const menuItems = boardNavItems(t, "ateliers");

  // Group ateliers by unit ranges for display
  const unite1Ateliers = ateliers.filter(a => a.unit === 1);
  const unite2to5Ateliers = ateliers.filter(a => a.unit >= 2 && a.unit <= 5);
  const unite6to10Ateliers = ateliers.filter(a => a.unit >= 6 && a.unit <= 10);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-10">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>{t("board.portal")}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button key={label} onClick={() => navigate(path)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm"
              style={{ background: active ? "#dff3ff" : "transparent", color: active ? "#004aad" : "#444", fontWeight: active ? 600 : 400 }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <LangToggle />
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm" style={{ color: "#ff5757" }}>
          <LogOut className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <button onClick={() => navigate("/board")} className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#38b6ff" }}>
          <ArrowLeft className="w-4 h-4" />
          {t("atelierMgmt.backToDashboard")}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#004aad" }}>
            {t("atelierMgmt.title")}
          </h1>
          <p className="text-base" style={{ color: "#666" }}>
            {t("atelierMgmt.subtitle")}
          </p>
        </div>

        {/* Unité 1: Ateliers 1-6 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
              <BookOpen className="w-5 h-5" style={{ color: "#ffffff" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#004aad" }}>
                {a("Unité 1 : Conscience phonologique et syllabes")}
              </h2>
              <p className="text-sm" style={{ color: "#666" }}>{t("reports.workshopsUnit1")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {unite1Ateliers.map((atelier) => (
              <button
                key={atelier.num}
                onClick={() => navigate(`/board/atelier/${atelier.num}`)}
                className="rounded-2xl p-5 text-left transition-all hover:shadow-lg"
                style={{ background: "#ffffff", border: `2px solid ${atelier.color}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: atelier.color, color: "#ffffff" }}>
                    {atelier.num}
                  </div>
                  <Edit2 className="w-5 h-5" style={{ color: "#38b6ff" }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#004aad" }}>
                  {tp("evaluation.workshopN", { n: atelier.num })}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                  {a(atelier.title)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Unités 2-5: Ateliers 7-10 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fbbf24" }}>
              <BookOpen className="w-5 h-5" style={{ color: "#000000" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#004aad" }}>
                {a("Unités 2-5 : Décodage et mots usuels")}
              </h2>
              <p className="text-sm" style={{ color: "#666" }}>{t("reports.workshopsUnit2to5")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {unite2to5Ateliers.map((atelier) => (
              <button
                key={atelier.num}
                onClick={() => navigate(`/board/atelier/${atelier.num}`)}
                className="rounded-2xl p-5 text-left transition-all hover:shadow-lg"
                style={{ background: "#ffffff", border: `2px solid ${atelier.color}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: atelier.color, color: atelier.unit === 3 || atelier.unit === 4 ? "#000000" : "#ffffff" }}>
                    {atelier.num}
                  </div>
                  <Edit2 className="w-5 h-5" style={{ color: "#38b6ff" }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#004aad" }}>
                  {tp("evaluation.workshopN", { n: atelier.num })}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                  {a(atelier.title)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Unités 6-10: Ateliers 11-15 */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ef4444" }}>
              <BookOpen className="w-5 h-5" style={{ color: "#ffffff" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#004aad" }}>
                {a("Unités 6-10 : Fluidité et compréhension")}
              </h2>
              <p className="text-sm" style={{ color: "#666" }}>{t("reports.workshopsUnit6to10")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {unite6to10Ateliers.map((atelier) => (
              <button
                key={atelier.num}
                onClick={() => navigate(`/board/atelier/${atelier.num}`)}
                className="rounded-2xl p-5 text-left transition-all hover:shadow-lg"
                style={{ background: "#ffffff", border: "2px solid #38b6ff" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: "#38b6ff", color: "#ffffff" }}>
                    {atelier.num}
                  </div>
                  <Edit2 className="w-5 h-5" style={{ color: "#38b6ff" }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#004aad" }}>
                  {tp("evaluation.workshopN", { n: atelier.num })}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                  {a(atelier.title)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
