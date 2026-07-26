import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  Download,
  FileCheck,
  BookOpen,
  Volume2,
  Rocket,
  PenLine,
  Search,
  Type,
  Music,
  Gauge,
  FileSearch,
  Target,
  RotateCcw,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { UserAvatar } from "../components/UserAvatar";
import { TeacherLayout } from "../components/TeacherLayout";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { formatAtelierLabel } from "../i18n/atelierHelpers";
import { teacherLibraryApi, teacherUnitsApi, type DownloadableCategoryItem, type PedagogicalUnitItem } from "../api/client";

interface Resource {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { t, tp, auto } = useLanguage();
  const { user } = useAuth();
  const [units, setUnits] = useState<PedagogicalUnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [downloadableCategories, setDownloadableCategories] = useState<DownloadableCategoryItem[]>([]);
  const [downloadableLoading, setDownloadableLoading] = useState(true);
  const teacherFirstName = user?.first_name || user?.name?.split(" ")[0] || t("dashboard.defaultTeacher");

  useEffect(() => {
    teacherUnitsApi
      .list()
      .then(({ units: data }) => setUnits(data))
      .catch(() => setUnits([]))
      .finally(() => setUnitsLoading(false));
  }, []);

  useEffect(() => {
    teacherLibraryApi
      .downloadableCategories()
      .then(({ categories }) => setDownloadableCategories(categories))
      .catch(() => setDownloadableCategories([]))
      .finally(() => setDownloadableLoading(false));
  }, []);

  const resources: Resource[] = units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    description: unit.description,
    icon: <FileCheck className="w-4 h-4" style={{ color: unit.color }} />,
  }));

  return (
    <TeacherLayout activeNav="library" contentClassName="flex-1 p-12 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {t("library.greeting")}, {teacherFirstName}!
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {t("library.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <UserAvatar />
          </div>
        </div>

        {/* Continuum Section */}
        <div
          className="rounded-2xl p-8 shadow-lg mb-8"
          style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl" style={{ color: "#004aad" }}>{t("library.continuumTitle")}</h2>
              <p className="text-sm mt-1" style={{ color: "#004aad", opacity: 0.6 }}>{t("library.smlSubtitle")}</p>
            </div>
            <button
              onClick={() => window.open(teacherLibraryApi.continuumDownloadUrl(), "_blank")}
              className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all cursor-pointer"
              style={{ background: "#004aad", color: "#ffffff" }}
            >
              <Download className="w-4 h-4" />
              {t("common.downloadPdf")}
            </button>
          </div>

          {/* 10-unit scrollable track */}
          <div className="overflow-x-auto pb-3 -mx-2 px-2 mt-6">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {[
                {
                  num: 1,
                  color: "#3b82f6",
                  textColor: "#ffffff",
                  Icon: Volume2,
                  title: "Conscience phonologique et syllabes",
                  desc: "Développer l'écoute des sons et la conscience des syllabes pour commencer à lire.",
                  bullets: ["Sons à l'oral", "Rimes", "Segmentation et fusion", "Syllabes", "Fusion de syllabes", "Sons initiaux et finaux"],
                  lecons: 13,
                },
                {
                  num: 2,
                  color: "#38bdf8",
                  textColor: "#000000",
                  Icon: Rocket,
                  title: "Décodage de base — Sons simples",
                  desc: "Apprendre les correspondances lettres-sons les plus simples pour commencer à décoder les mots.",
                  bullets: ["Voyelles à son court", "Association des syllabes", "Correspondance son-lettre", "Lecture de CV, VC, CVC"],
                  lecons: 8,
                },
                {
                  num: 3,
                  color: "#22d3ee",
                  textColor: "#000000",
                  Icon: BookOpen,
                  title: "Syllabes et mots fréquents",
                  desc: "Renforcer la lecture de syllabes complexes et de mots fréquents pour améliorer la fluidité.",
                  bullets: ["Syllabes ouvertes et fermées", "Syllabes complexes (CVCc, CCVc)", "Mots fréquents (liste)", "Mots à haute fréquence"],
                  lecons: 8,
                },
                {
                  num: 4,
                  color: "#a3e635",
                  textColor: "#000000",
                  Icon: PenLine,
                  title: "Phrases simples et textes courts",
                  desc: "Lire des phrases simples et de courts textes avec fluidité et compréhension.",
                  bullets: ["Phrases simples (sujet-verbe-objet)", "Signes graphiques", "Compréhension", "Textes courts"],
                  lecons: 8,
                },
                {
                  num: 5,
                  color: "#fbbf24",
                  textColor: "#000000",
                  Icon: Search,
                  title: "Graphèmes complexes et digrammes",
                  desc: "Décoder les mots complexes avec des graphèmes et digrammes fréquents.",
                  bullets: ["Digrammes et trigrammes (gn, ch, ill, oi, eu…)", "au, eau, ou, ai, ei, oi…", "Fluidité et confiance", "Mots fréquents"],
                  lecons: 8,
                },
                {
                  num: 6,
                  color: "#fb923c",
                  textColor: "#000000",
                  Icon: Type,
                  title: "Régularités orthographiques et morphologie",
                  desc: "Reconnaître les régularités orthographiques et les patterns de mots courants.",
                  bullets: ["Familles de mots (pas, passé, passer)", "Terminaisons (-tion, -sion)", "Préfixes et suffixes", "Pluriels"],
                  lecons: 8,
                },
                {
                  num: 7,
                  color: "#fb7185",
                  textColor: "#000000",
                  Icon: Music,
                  title: "Rimes complexes et semi-voyelles",
                  desc: "Maîtriser les rimes complexes et les semi-voyelles dans des textes variés.",
                  bullets: ["-ille, -ouille, -aille", "Le son /j/ (y, il, ille)", "Triphtongues", "Lecture de textes graduels"],
                  lecons: 8,
                },
                {
                  num: 8,
                  color: "#a855f7",
                  textColor: "#ffffff",
                  Icon: Gauge,
                  title: "Fluidité et expression",
                  desc: "Lire avec fluidité, justesse et expression dans des textes plus longs.",
                  bullets: ["Lecture répétée", "Lecture chronométrée", "Enregistrement et écoute", "Textes variés"],
                  lecons: 8,
                },
                {
                  num: 9,
                  color: "#0ea5e9",
                  textColor: "#ffffff",
                  Icon: FileSearch,
                  title: "Compréhension et inférence",
                  desc: "Comprendre, analyser et faire des liens dans des textes courants et littéraires.",
                  bullets: ["Idées principales et détails", "Inférence et déduction", "Vocabulaire en contexte", "Résumé", "Comparaison et évaluation"],
                  lecons: 8,
                },
                {
                  num: 10,
                  color: "#ef4444",
                  textColor: "#ffffff",
                  Icon: Target,
                  title: "Stratégies approfondies",
                  desc: "Utiliser des stratégies avancées pour s'autoévaluer et approfondir la compréhension.",
                  bullets: ["Genres littéraires", "Autoévaluation", "Visualisation", "Vocabulaire en contexte", "Résumé", "Comparaison et évaluation"],
                  lecons: 8,
                },
              ].map(({ num, color, textColor, Icon, title, desc, bullets, lecons }) => (
                <div
                  key={num}
                  className="flex flex-col rounded-2xl overflow-hidden"
                  style={{ width: 200, minWidth: 200, border: `2px solid ${color}` }}
                >
                  {/* Colored header */}
                  <div className="flex flex-col items-center pt-5 pb-4 px-4 gap-2" style={{ background: color }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                      style={{ background: "rgba(255,255,255,0.25)", color: textColor }}
                    >
                      {num}
                    </div>
                    <Icon className="w-6 h-6" style={{ color: "rgba(255,255,255,0.9)" }} />
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4" style={{ background: "#ffffff" }}>
                    <p className="text-xs font-bold leading-snug mb-2" style={{ color }}>
                      {auto(title)}
                    </p>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "#555", opacity: 0.85 }}>
                      {auto(desc)}
                    </p>
                    <ul className="flex-1 space-y-1 mb-4">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-start gap-1.5 text-xs" style={{ color: "#333" }}>
                          <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                          {auto(b)}
                        </li>
                      ))}
                    </ul>

                    {/* Lesson count badge */}
                    <div
                      className="text-center text-xs font-bold py-1.5 rounded-lg"
                      style={{ background: color, color: textColor }}
                    >
                      {tp("library.lessonCount", { count: String(lecons) })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual atelier bar */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#004aad" }}>
              {t("library.ateliersAssociated")}
            </p>

            {/* Bar */}
            <div className="flex h-10 rounded-xl overflow-hidden w-full">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-center text-xs font-bold border-r border-white/30"
                  style={{ flex: Math.max(unit.atelier_count, 1), background: unit.color, color: unit.text_color, minWidth: 0 }}
                  title={unit.title}
                >
                  {unit.sort_order}
                </div>
              ))}
            </div>

            {/* Atelier labels below bar */}
            <div className="flex w-full mt-2">
              {units.map((unit) => (
                <div key={unit.id} className="text-center" style={{ flex: Math.max(unit.atelier_count, 1) }}>
                  <p className="text-xs" style={{ color: "#555" }}>
                    {formatAtelierLabel(unit.atelier_numbers, (n) => tp("evaluation.workshopN", { n }), t("common.ateliers"))}
                  </p>
                </div>
              ))}
            </div>

            {/* Return note */}
            <p className="text-xs italic mt-3" style={{ color: "#555" }}>
              <RotateCcw className="w-3 h-3 inline mr-1 relative -top-px" style={{ color: "#004aad" }} />
              {t("library.returnNote")}
            </p>
          </div>
        </div>

        {/* Resources Grid */}
        <div>
          <h2 className="text-3xl mb-8 font-bold" style={{ color: "#004aad", letterSpacing: "-0.02em" }}>
            {t("library.pedagogicalUnits")}
          </h2>

          <div className="grid grid-cols-5 gap-5 mb-12">
            {unitsLoading ? (
              <p className="text-sm col-span-5" style={{ color: "#94a3b8" }}>Loading units…</p>
            ) : resources.map((resource) => {
              const unit = units.find((u) => u.id === resource.id);
              const colors = unit
                ? { bg: unit.color, text: unit.text_color }
                : { bg: "#3b82f6", text: "#ffffff" };
              return (
                <div
                  key={resource.id}
                  className="group transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "24px 20px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  <div className="flex flex-col items-center text-center justify-between h-full">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                        style={{
                          background: colors.bg,
                          boxShadow: `0 4px 16px ${colors.bg}40`
                        }}
                      >
                        <FileCheck className="w-7 h-7" style={{ color: colors.text }} />
                      </div>

                      <div className="space-y-1">
                        <h3
                          className="font-bold text-base leading-tight"
                          style={{ color: "#004aad" }}
                        >
                          {auto(resource.title)}
                        </h3>
                        <p
                          className="text-xs leading-snug"
                          style={{ color: "#666", lineHeight: "1.4" }}
                        >
                          {auto(resource.description)}
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-2 mt-4">
                      <button
                        onClick={() => {
                          if (unit?.has_quick_sheet) {
                            window.open(teacherUnitsApi.quickSheetDownloadUrl(unit.id), "_blank");
                          }
                        }}
                        disabled={!unit?.has_quick_sheet}
                        className="w-full py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          background: `${colors.bg}15`,
                          color: colors.bg,
                          border: `2px solid ${colors.bg}30`
                        }}
                        onMouseEnter={(e) => {
                          if (!unit?.has_quick_sheet) return;
                          e.currentTarget.style.background = colors.bg;
                          e.currentTarget.style.color = colors.text;
                          e.currentTarget.style.borderColor = colors.bg;
                        }}
                        onMouseLeave={(e) => {
                          if (!unit?.has_quick_sheet) return;
                          e.currentTarget.style.background = `${colors.bg}15`;
                          e.currentTarget.style.color = colors.bg;
                          e.currentTarget.style.borderColor = `${colors.bg}30`;
                        }}
                      >
                        <Download className="w-3 h-3" />
                        {t("library.quickSheet")}
                      </button>
                      <button
                        onClick={() => navigate(`/resource/${resource.id}`)}
                        className="w-full py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        style={{
                          background: `${colors.bg}15`,
                          color: colors.bg,
                          border: `2px solid ${colors.bg}30`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = colors.bg;
                          e.currentTarget.style.color = colors.text;
                          e.currentTarget.style.borderColor = colors.bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = `${colors.bg}15`;
                          e.currentTarget.style.color = colors.bg;
                          e.currentTarget.style.borderColor = `${colors.bg}30`;
                        }}
                      >
                        <ArrowRight className="w-3 h-3" />
                        {t("library.lessonsButton")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Downloadable Resources Section */}
          <h2 className="text-3xl mb-8 font-bold mt-16" style={{ color: "#004aad", letterSpacing: "-0.02em" }}>
            {t("library.downloadable")}
          </h2>

          <div className="space-y-4">
            {downloadableLoading ? (
              <p className="text-sm" style={{ color: "#94a3b8" }}>Loading resources…</p>
            ) : downloadableCategories.length === 0 ? (
              <p className="text-sm" style={{ color: "#94a3b8" }}>{t("library.noUploadedContent")}</p>
            ) : downloadableCategories.map((category) => {
              const resources = category.resources ?? [];
              const uploadedCount = resources.filter((r) => r.has_file).length;
              if (resources.length === 0) return null;
              return (
              <details
                key={category.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "#ffffff",
                  border: `2px solid ${category.color}20`,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                }}
              >
                <summary
                  className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-opacity-50 transition-all"
                  style={{
                    background: `${category.color}10`,
                    listStyle: "none"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: category.color }}
                    >
                      <FileText className="w-5 h-5" style={{ color: "#ffffff" }} />
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: "#004aad" }}>
                      {auto(category.title)}
                    </h3>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: `${category.color}20`,
                        color: category.color
                      }}
                    >
                      {tp("library.resourceCount", { count: String(uploadedCount > 0 ? uploadedCount : resources.length) })}
                    </span>
                  </div>
                  <ChevronDown className="w-5 h-5" style={{ color: category.color }} />
                </summary>
                <div className="p-6 grid grid-cols-3 gap-3">
                  {resources.map((resource) =>
                    resource.has_file ? (
                      <a
                        key={resource.id}
                        href={teacherLibraryApi.downloadableDownloadUrl(resource.id)}
                        download
                        className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all text-left"
                        style={{
                          background: `${category.color}08`,
                          border: `1px solid ${category.color}20`,
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = `${category.color}15`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = `${category.color}08`;
                        }}
                      >
                        <Download className="w-4 h-4" style={{ color: category.color }} />
                        <span className="text-sm" style={{ color: "#004aad" }}>
                          {auto(resource.title)}
                        </span>
                      </a>
                    ) : (
                      <div
                        key={resource.id}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-left opacity-50"
                        style={{
                          background: `${category.color}08`,
                          border: `1px solid ${category.color}20`,
                        }}
                      >
                        <Download className="w-4 h-4" style={{ color: category.color }} />
                        <span className="text-sm" style={{ color: "#004aad" }}>
                          {auto(resource.title)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </details>
              );
            })}
          </div>
        </div>
    </TeacherLayout>
  );
}
