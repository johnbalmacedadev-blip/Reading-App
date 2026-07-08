import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, BookOpen, LogOut } from "lucide-react";
import { useLanguage } from "../i18n";
import { LangToggle } from "../components/LangToggle";
import { boardNavItems } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";

interface AtelierQuestion {
  id: string;
  text: string;
  type: "checkbox" | "text" | "grid";
}

const atelierTemplates: Record<number, { title: string; description: string; instructions: string; questions: AtelierQuestion[] }> = {
  1: {
    title: "Atelier 1 : Reconnaissance du nom des lettres majuscules",
    description: "Évaluation de la capacité à nommer les lettres majuscules",
    instructions: "Présenter les lettres majuscules une à une à l'élève et lui demander de nommer chaque lettre.",
    questions: [
      { id: "grid-alphabet-upper", text: "Grille de reconnaissance des noms (A-Z)", type: "grid" },
    ],
  },
  2: {
    title: "Atelier 2 : Reconnaissance du son des lettres majuscules",
    description: "Évaluation de la capacité à identifier le son des lettres majuscules",
    instructions: "Présenter les lettres majuscules une à une à l'élève et lui demander de produire le son de chaque lettre.",
    questions: [
      { id: "grid-sounds-upper", text: "Grille de reconnaissance des sons (A-Z)", type: "grid" },
    ],
  },
  3: {
    title: "Atelier 3 : Reconnaissance du nom des lettres minuscules",
    description: "Évaluation de la capacité à nommer les lettres minuscules",
    instructions: "Présenter les lettres minuscules une à une à l'élève et lui demander de nommer chaque lettre.",
    questions: [
      { id: "grid-alphabet-lower", text: "Grille de reconnaissance des noms (a-z)", type: "grid" },
    ],
  },
  4: {
    title: "Atelier 4 : Reconnaissance du son des lettres minuscules",
    description: "Évaluation de la capacité à identifier le son des lettres minuscules",
    instructions: "Présenter les lettres minuscules une à une à l'élève et lui demander de produire le son de chaque lettre.",
    questions: [
      { id: "grid-sounds-lower", text: "Grille de reconnaissance des sons (a-z)", type: "grid" },
    ],
  },
  5: {
    title: "Atelier 5 : Grapho majuscule (écriture à l'énoncé)",
    description: "Évaluation de la capacité à écrire les lettres majuscules lorsque l'enseignant énonce le nom de la lettre",
    instructions: "Énoncer le nom de chaque lettre et demander à l'élève d'écrire la lettre majuscule correspondante.",
    questions: [
      { id: "grid-grapho-upper", text: "Grille d'écriture majuscule (A-Z)", type: "grid" },
    ],
  },
  6: {
    title: "Atelier 6 : Grapho minuscule (écriture à l'énoncé)",
    description: "Évaluation de la capacité à écrire les lettres minuscules lorsque l'enseignant énonce le nom de la lettre",
    instructions: "Énoncer le nom de chaque lettre et demander à l'élève d'écrire la lettre minuscule correspondante.",
    questions: [
      { id: "grid-grapho-lower", text: "Grille d'écriture minuscule (a-z)", type: "grid" },
    ],
  },
};

export function AtelierEditPage() {
  const navigate = useNavigate();
  const { t, tp, auto: a } = useLanguage();
  const handleLogout = usePortalLogout();
  const { atelierNum } = useParams();
  const num = parseInt(atelierNum || "1");

  const menuItems = boardNavItems(t, "ateliers");

  // Get template or create default
  const defaultTemplate = atelierTemplates[num] || {
    title: tp("evaluation.workshopN", { n: num }),
    description: a("Description de l'atelier"),
    instructions: a("Instructions pour l'enseignant"),
    questions: [],
  };

  const [title, setTitle] = useState(defaultTemplate.title);
  const [description, setDescription] = useState(defaultTemplate.description);
  const [instructions, setInstructions] = useState(defaultTemplate.instructions);
  const [questions, setQuestions] = useState<AtelierQuestion[]>(defaultTemplate.questions);

  const handleAddQuestion = () => {
    const newQuestion: AtelierQuestion = {
      id: `q-${Date.now()}`,
      text: a("Nouvelle question"),
      type: "checkbox",
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, field: keyof AtelierQuestion, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSave = () => {
    alert(a("Modifications sauvegardées avec succès!"));
  };

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

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0" style={{ background: "#ffffff", borderColor: "#dff3ff" }}>
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate("/board/ateliers")} className="flex items-center gap-2 mb-4 text-sm" style={{ color: "#38b6ff" }}>
            <ArrowLeft className="w-4 h-4" />
            {t("atelierEdit.backToWorkshops")}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="inline-block px-4 py-2 rounded-lg mb-3" style={{ background: "#004aad", color: "#ffffff" }}>
                <p className="text-sm">{t("evaluation.smlSystem")} — {a("Mode édition")}</p>
              </div>
              <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
                {tp("evaluation.workshopN", { n: num })}
              </h1>
              <p className="text-sm" style={{ color: "#666" }}>
                {a("Modifier le modèle d'évaluation")}
              </p>
            </div>

            <button onClick={handleSave} className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
              style={{ background: "#004aad", color: "#ffffff" }}>
              <Save className="w-5 h-5" />
              {t("atelierEdit.saveChanges")}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Basic Information */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
              {a("Informations de base")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#004aad" }}>
                  {a("Titre de l'atelier")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#004aad" }}>
                  {a("Description")}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#004aad" }}>
                  {t("atelierEdit.teacherInstructions")}
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                  placeholder={t("atelierEdit.adminPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: "#004aad" }}>
                {a("Questions d'évaluation")}
              </h2>
              <button onClick={handleAddQuestion} className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                style={{ background: "#dff3ff", color: "#004aad" }}>
                <Plus className="w-4 h-4" />
                {a("Ajouter une question")}
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12" style={{ background: "#f7ffd6", borderRadius: "12px" }}>
                <p style={{ color: "#666" }}>{a('Aucune question configurée. Cliquez sur "Ajouter une question" pour commencer.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-5 rounded-xl border" style={{ background: "#f7ffd6", borderColor: "#c9e265" }}>
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <GripVertical className="w-5 h-5" style={{ color: "#888" }} />
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: "#38b6ff", color: "#fff" }}>
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#004aad" }}>
                            {a("Texte de la question")}
                          </label>
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => handleQuestionChange(question.id, "text", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#004aad" }}>
                            {a("Type de réponse")}
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => handleQuestionChange(question.id, "type", e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                            style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                          >
                            <option value="checkbox">{a("Case à cocher (Oui/Non)")}</option>
                            <option value="text">{a("Champ texte (Réponse écrite)")}</option>
                            <option value="grid">{a("Grille (Multiple éléments)")}</option>
                          </select>
                        </div>
                      </div>

                      <button onClick={() => handleDeleteQuestion(question.id)} className="p-2 rounded-lg transition-all hover:bg-red-100"
                        style={{ color: "#ff5757" }}>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evaluation Criteria */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
              {a("Critères d'évaluation")}
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl" style={{ background: "#f0fff4", border: "1px solid #c9e265" }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#2e7d32" }}>
                  {t("reports.onTrackAcquired")}
                </h3>
                <p className="text-xs" style={{ color: "#666" }}>
                  {a("Critères pour déterminer qu'un élève est en voie de réussir cet atelier")}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: "#fff9e6", border: "1px solid #ffde59" }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#d97706" }}>
                  {t("common.monitor")}
                </h3>
                <p className="text-xs" style={{ color: "#666" }}>
                  {a("Critères indiquant qu'un élève nécessite un suivi")}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: "#fff5f5", border: "1px solid #ff5757" }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#dc2626" }}>
                  {t("common.atRisk")}
                </h3>
                <p className="text-xs" style={{ color: "#666" }}>
                  {a("Critères indiquant qu'un élève est à risque et nécessite un soutien immédiat")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
