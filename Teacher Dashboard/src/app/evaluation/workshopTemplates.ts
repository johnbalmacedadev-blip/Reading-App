export type WorkshopTemplateId =
  | "format_1"
  | "format_2"
  | "format_3"
  | "format_4"
  | "format_5"
  | "format_6"
  | "format_7"
  | "format_8"
  | "format_9"
  | "format_10"
  | "format_11"
  | "format_12"
  | "format_13"
  | "format_14"
  | "format_15";

export type LetterGridColumn = "name" | "sound";

export type LetterGridSection = {
  titleFr: string;
  letters: string[];
  columns: LetterGridColumn[];
};

export type LetterWriteListSection = {
  titleFr: string;
  items: string[];
};

export type WordSoundItem = {
  word: string;
  sound: string;
};

export type WordSoundListSection = {
  titleFr: string;
  items: WordSoundItem[];
};

export type CheckboxTableRow = Record<string, string | number>;

export type CheckboxTableSection = {
  titleFr: string;
  promptFr: string;
  columns: { key: string; labelFr: string; align?: "left" | "center" }[];
  rows: CheckboxTableRow[];
  showPassedColumn?: boolean;
  promptShowsInstructionsLabel?: boolean;
};

export type ItemGridSection = {
  titleFr: string;
  promptFr: string;
  items: string[];
  variant?: "default" | "highlight";
  promptShowsInstructionsLabel?: boolean;
};

export type WordFamilySection = {
  titleFr: string;
  promptFr: string;
  families: string[][];
  variant?: "default" | "highlight";
};

export type SentenceCriterion = {
  key: string;
  labelFr: string;
};

export type SentenceReadingSection = {
  titleFr: string;
  promptFr: string;
  sentences: string[];
  criteria: SentenceCriterion[];
  variant?: "default" | "highlight";
};

export type ReadingMixedSection = WordFamilySection | ItemGridSection;
export type FluencyMixedSection = SentenceReadingSection | ItemGridSection;

export type ComprehensionQuestion = {
  questionFr: string;
  answerFr: string;
};

export type PassageSection = {
  titleFr: string;
  promptFr?: string;
  passageFr: string;
  fluencyCriterionFr?: string;
  variant?: "default" | "highlight";
};

export type ComprehensionQuestionsSection = {
  titleFr: string;
  promptFr?: string;
  questions: ComprehensionQuestion[];
  variant?: "default" | "highlight";
};

export type ComprehensionMixedSection = PassageSection | ComprehensionQuestionsSection;

export function isWordFamilySection(section: ReadingMixedSection): section is WordFamilySection {
  return "families" in section;
}

export function isSentenceReadingSection(section: FluencyMixedSection): section is SentenceReadingSection {
  return "sentences" in section;
}

export function isPassageSection(section: ComprehensionMixedSection): section is PassageSection {
  return "passageFr" in section;
}

export type MixedSection = ItemGridSection | CheckboxTableSection;

export function isItemGridSection(section: MixedSection): section is ItemGridSection {
  return "items" in section && !("rows" in section);
}

export type LetterGridTemplate = {
  id: "format_1" | "format_2";
  name: "Template Format 1" | "Template Format 2";
  description: string;
  sourceWorkshop: 1 | 2;
  format: "letter_grid";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: LetterGridSection[];
};

export type LetterWriteListTemplate = {
  id: "format_3" | "format_4";
  name: "Template Format 3" | "Template Format 4";
  description: string;
  sourceWorkshop: 3 | 4;
  format: "letter_write_list";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: LetterWriteListSection[];
};

export type CheckboxSectionsTemplate = {
  id: "format_5";
  name: "Template Format 5";
  description: string;
  sourceWorkshop: 5;
  format: "checkbox_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: CheckboxTableSection[];
};

export type WordSoundListTemplate = {
  id: "format_6";
  name: "Template Format 6";
  description: string;
  sourceWorkshop: 6;
  format: "word_sound_list";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: WordSoundListSection[];
};

export type MixedSectionsTemplate = {
  id: "format_7";
  name: "Template Format 7";
  description: string;
  sourceWorkshop: 7;
  format: "mixed_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: MixedSection[];
};

export type ItemGridSectionsTemplate = {
  id: "format_8" | "format_9" | "format_10" | "format_13";
  name: "Template Format 8" | "Template Format 9" | "Template Format 10" | "Template Format 13";
  description: string;
  sourceWorkshop: 8 | 9 | 10 | 13;
  format: "item_grid_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: ItemGridSection[];
};

export type MixedReadingSectionsTemplate = {
  id: "format_11";
  name: "Template Format 11";
  description: string;
  sourceWorkshop: 11;
  format: "mixed_reading_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: ReadingMixedSection[];
};

export type FluencySectionsTemplate = {
  id: "format_12";
  name: "Template Format 12";
  description: string;
  sourceWorkshop: 12;
  format: "fluency_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: FluencyMixedSection[];
};

export type ComprehensionSectionsTemplate = {
  id: "format_14" | "format_15";
  name: "Template Format 14" | "Template Format 15";
  description: string;
  sourceWorkshop: 14 | 15;
  format: "comprehension_sections";
  instructionsFr: string;
  bulkActions: ("all_passed" | "all_failed" | "clear_all" | "support_pdf")[];
  sections: ComprehensionMixedSection[];
};

export type MultipleChoiceQuestion = {
  text: string;
  options: string[];
  correct: number;
};

export type WorkshopTemplate =
  | LetterGridTemplate
  | LetterWriteListTemplate
  | CheckboxSectionsTemplate
  | WordSoundListTemplate
  | MixedSectionsTemplate
  | ItemGridSectionsTemplate
  | MixedReadingSectionsTemplate
  | FluencySectionsTemplate
  | ComprehensionSectionsTemplate;

export type TemplateDraft = {
  name: string;
  instructionsFr: string;
  sections?:
    | LetterGridSection[]
    | LetterWriteListSection[]
    | CheckboxTableSection[]
    | WordSoundListSection[]
    | MixedSection[]
    | ItemGridSection[]
    | ReadingMixedSection[]
    | FluencyMixedSection[]
    | ComprehensionMixedSection[];
  questions?: MultipleChoiceQuestion[];
};

export const MULTIPLE_CHOICE_OPTION_COUNT = 4;

export function createEmptyMultipleChoiceQuestion(): MultipleChoiceQuestion {
  return {
    text: "",
    options: Array.from({ length: MULTIPLE_CHOICE_OPTION_COUNT }, () => ""),
    correct: 0,
  };
}

export function normalizeMultipleChoiceQuestion(
  question: MultipleChoiceQuestion
): MultipleChoiceQuestion {
  const options = Array.from({ length: MULTIPLE_CHOICE_OPTION_COUNT }, (_, index) =>
    question.options[index]?.trim() ?? ""
  );
  const correct = Math.min(
    Math.max(question.correct ?? 0, 0),
    MULTIPLE_CHOICE_OPTION_COUNT - 1
  );
  return { text: question.text, options, correct };
}

const ALPHABET_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALPHABET_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");

function isLetterGridSections(sections: unknown): sections is LetterGridSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every(
      (section) =>
        section != null &&
        typeof section === "object" &&
        Array.isArray((section as LetterGridSection).letters) &&
        Array.isArray((section as LetterGridSection).columns)
    )
  );
}

function isLetterWriteListSections(sections: unknown): sections is LetterWriteListSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every(
      (section) =>
        section != null &&
        typeof section === "object" &&
        typeof (section as LetterWriteListSection).titleFr === "string" &&
        Array.isArray((section as LetterWriteListSection).items) &&
        (section as LetterWriteListSection).items.every((item) => typeof item === "string")
    )
  );
}

function isCheckboxTableSections(sections: unknown): sections is CheckboxTableSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every(
      (section) =>
        section != null &&
        typeof section === "object" &&
        typeof (section as CheckboxTableSection).titleFr === "string" &&
        Array.isArray((section as CheckboxTableSection).columns) &&
        Array.isArray((section as CheckboxTableSection).rows)
    )
  );
}

function isWordSoundListSections(sections: unknown): sections is WordSoundListSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every(
      (section) =>
        section != null &&
        typeof section === "object" &&
        typeof (section as WordSoundListSection).titleFr === "string" &&
        Array.isArray((section as WordSoundListSection).items) &&
        (section as WordSoundListSection).items.every(
          (item) =>
            item != null &&
            typeof item === "object" &&
            typeof (item as WordSoundItem).word === "string" &&
            typeof (item as WordSoundItem).sound === "string"
        )
    )
  );
}

function isMixedSections(sections: unknown): sections is MixedSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every((section) => {
      if (section == null || typeof section !== "object") return false;
      if (Array.isArray((section as ItemGridSection).items) && !("rows" in section)) return true;
      return (
        Array.isArray((section as CheckboxTableSection).rows) &&
        Array.isArray((section as CheckboxTableSection).columns)
      );
    })
  );
}

function isItemGridSections(sections: unknown): sections is ItemGridSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every(
      (section) =>
        section != null &&
        typeof section === "object" &&
        typeof (section as ItemGridSection).titleFr === "string" &&
        typeof (section as ItemGridSection).promptFr === "string" &&
        Array.isArray((section as ItemGridSection).items) &&
        (section as ItemGridSection).items.every((item) => typeof item === "string")
    )
  );
}

function isMixedReadingSections(sections: unknown): sections is ReadingMixedSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every((section) => {
      if (section == null || typeof section !== "object") return false;
      if (Array.isArray((section as WordFamilySection).families)) {
        return (section as WordFamilySection).families.every(
          (family) => Array.isArray(family) && family.every((word) => typeof word === "string")
        );
      }
      return (
        typeof (section as ItemGridSection).promptFr === "string" &&
        Array.isArray((section as ItemGridSection).items) &&
        (section as ItemGridSection).items.every((item) => typeof item === "string")
      );
    })
  );
}

function isFluencySections(sections: unknown): sections is FluencyMixedSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every((section) => {
      if (section == null || typeof section !== "object") return false;
      if (Array.isArray((section as SentenceReadingSection).sentences)) {
        const sentenceSection = section as SentenceReadingSection;
        return (
          sentenceSection.sentences.every((sentence) => typeof sentence === "string") &&
          Array.isArray(sentenceSection.criteria)
        );
      }
      return (
        typeof (section as ItemGridSection).promptFr === "string" &&
        Array.isArray((section as ItemGridSection).items) &&
        (section as ItemGridSection).items.every((item) => typeof item === "string")
      );
    })
  );
}

function isComprehensionSections(sections: unknown): sections is ComprehensionMixedSection[] {
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    sections.every((section) => {
      if (section == null || typeof section !== "object") return false;
      if (typeof (section as PassageSection).passageFr === "string") return true;
      return Array.isArray((section as ComprehensionQuestionsSection).questions);
    })
  );
}

export const WORKSHOP_TEMPLATES: WorkshopTemplate[] = [
  {
    id: "format_1",
    name: "Template Format 1",
    description: "Letter recognition grid with pass/fail toggles for letter name and sound.",
    sourceWorkshop: 1,
    format: "letter_grid",
    instructionsFr:
      "Présenter chaque lettre majuscule à l'élève et demander : \"Quel est le nom de cette lettre ?\" puis \"Quel son fait cette lettre ?\"",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lettres majuscules",
        letters: ALPHABET_UPPER,
        columns: ["name", "sound"],
      },
    ],
  },
  {
    id: "format_2",
    name: "Template Format 2",
    description: "Lowercase letter recognition grid with pass/fail toggles for letter name and sound.",
    sourceWorkshop: 2,
    format: "letter_grid",
    instructionsFr:
      "Présenter chaque lettre minuscule à l'élève et demander : « Quel est le nom de cette lettre ? » puis « Quel son fait cette lettre ? »",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lettres minuscules",
        letters: ALPHABET_LOWER,
        columns: ["name", "sound"],
      },
    ],
  },
  {
    id: "format_3",
    name: "Template Format 3",
    description: "Uppercase letter formation checklist with pass/fail toggles for written letters.",
    sourceWorkshop: 3,
    format: "letter_write_list",
    instructionsFr:
      "Dire le nom de chaque lettre majuscule à l'élève et lui demander de l'écrire.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Écrire les lettres majuscules",
        items: ALPHABET_UPPER,
      },
    ],
  },
  {
    id: "format_4",
    name: "Template Format 4",
    description: "Lowercase letter formation checklist with pass/fail toggles for written letters.",
    sourceWorkshop: 4,
    format: "letter_write_list",
    instructionsFr:
      "Dire le nom de chaque lettre minuscule à l'élève et lui demander de l'écrire.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Écrire les lettres minuscules",
        items: ALPHABET_LOWER,
      },
    ],
  },
  {
    id: "format_5",
    name: "Template Format 5",
    description: "Multi-section checklist for rhymes, syllable blending, and syllable counting.",
    sourceWorkshop: 5,
    format: "checkbox_sections",
    instructionsFr:
      "Évaluer la capacité de l'élève à identifier les rimes, segmenter/fusionner et compter les syllabes. Pour chaque section, demander à l'élève d'écouter attentivement et de répondre.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Identifier des mots qui riment",
        promptFr: "Demander à l'élève : « Est-ce que ces mots riment? »",
        columns: [
          { key: "pair", labelFr: "Paire de mots", align: "left" },
          { key: "answer", labelFr: "Réponse correcte", align: "center" },
          { key: "passed", labelFr: "Réussi", align: "center" },
        ],
        rows: [
          { pair: "chat / rat", answer: "Oui" },
          { pair: "fleur / table", answer: "Non" },
          { pair: "bateau / chapeau", answer: "Oui" },
          { pair: "pain / main", answer: "Oui" },
          { pair: "lune / porte", answer: "Non" },
        ],
        showPassedColumn: true,
      },
      {
        titleFr: "Segmenter et fusionner des syllabes",
        promptFr: "Lire le mot segmenté. Demander à l'élève : « Quel mot est-ce que ça fait? »",
        columns: [
          { key: "segmented", labelFr: "Mot segmenté", align: "left" },
          { key: "full", labelFr: "Mot complet", align: "center" },
          { key: "passed", labelFr: "Réussi", align: "center" },
        ],
        rows: [
          { segmented: "ma-man", full: "maman" },
          { segmented: "ta-ble", full: "table" },
          { segmented: "cha-peau", full: "chapeau" },
          { segmented: "voi-ture", full: "voiture" },
          { segmented: "ba-na-ne", full: "banane" },
        ],
        showPassedColumn: true,
      },
      {
        titleFr: "Compter les syllabes dans un mot",
        promptFr:
          "Dire le mot à l'élève. Demander : « Combien de syllabes entends-tu dans ce mot? » L'élève doit vous dire le nombre.",
        promptShowsInstructionsLabel: true,
        columns: [
          { key: "word", labelFr: "Mot", align: "left" },
          { key: "count", labelFr: "Nombre de syllabes", align: "center" },
          { key: "passed", labelFr: "Réussi", align: "center" },
        ],
        rows: [
          { word: "chat", count: 1 },
          { word: "livre", count: 1 },
          { word: "éléphant", count: 3 },
          { word: "chocolat", count: 3 },
          { word: "papillon", count: 3 },
        ],
        showPassedColumn: true,
      },
    ],
  },
  {
    id: "format_6",
    name: "Template Format 6",
    description: "Initial and final sound identification with word prompts and phoneme hints.",
    sourceWorkshop: 6,
    format: "word_sound_list",
    instructionsFr:
      "Demander à l'élève d'identifier les sons au début et à la fin des mots. Dire le mot clairement et demander : « Quel son entends-tu au début/à la fin? »",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Identifier le son au début d'un mot",
        items: [
          { word: "maison", sound: "/m/" },
          { word: "ballon", sound: "/b/" },
          { word: "soleil", sound: "/s/" },
          { word: "fenêtre", sound: "/f/" },
          { word: "chat", sound: "/ʃ/" },
        ],
      },
      {
        titleFr: "Identifier le son à la fin d'un mot",
        items: [
          { word: "chat", sound: "/a/" },
          { word: "pomme", sound: "/m/" },
          { word: "souris", sound: "/i/" },
          { word: "sac", sound: "/k/" },
          { word: "fil", sound: "/l/" },
        ],
      },
    ],
  },
  {
    id: "format_7",
    name: "Template Format 7",
    description: "Syllable reading grid plus grapheme-to-sound correspondence table.",
    sourceWorkshop: 7,
    format: "mixed_sections",
    instructionsFr:
      "Évaluer la lecture de syllabes simples et la correspondance son-lettre. Pour la section correspondance, montrer 3 lettres à l'élève et demander de pointer la lettre qui fait le son indiqué.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire des syllabes CV, VC et CVC",
        promptFr: "Demander à l'élève de lire chaque syllabe.",
        items: ["ma", "li", "po", "ru", "sa", "il", "or", "pa", "mi", "bol"],
      },
      {
        titleFr: "Associer les sons aux graphèmes correspondants",
        promptFr:
          "Montrer 3 lettres à l'élève. Dire : « Pointe la lettre qui fait le son /___/. » Par exemple, montrer « b – f – l » et demander : « Pointe la lettre qui fait le son /f/. »",
        promptShowsInstructionsLabel: true,
        columns: [
          { key: "letters", labelFr: "Lettres montrées", align: "left" },
          { key: "sound", labelFr: "Son demandé", align: "center" },
          { key: "correct", labelFr: "Lettre correcte", align: "center" },
          { key: "passed", labelFr: "Réussi", align: "center" },
        ],
        rows: [
          { letters: "a – e – t", sound: "/a/", correct: "a" },
          { letters: "e – s – n", sound: "/e/", correct: "e" },
          { letters: "t – a – s", sound: "/t/", correct: "t" },
          { letters: "n – e – s", sound: "/s/", correct: "s" },
          { letters: "a – t – n", sound: "/n/", correct: "n" },
        ],
        showPassedColumn: true,
      },
    ],
  },
  {
    id: "format_8",
    name: "Template Format 8",
    description: "Syllable reading grids for open/closed, complex syllables, and sight words.",
    sourceWorkshop: 8,
    format: "item_grid_sections",
    instructionsFr: "Évaluer la lecture de différents types de syllabes et de mots usuels.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire des syllabes ouvertes et fermées",
        promptFr: "Demander à l'élève de lire chaque syllabe à voix haute.",
        items: ["ba", "li", "por", "val", "tur"],
      },
      {
        titleFr: "Lire des syllabes complexes - CVCC, CCVC",
        promptFr: "Demander à l'élève de lire chaque syllabe complexe à voix haute.",
        items: ["pla", "bri", "tro", "flan", "gros"],
      },
      {
        titleFr: "Lire 5 mots usuels",
        promptFr:
          "Ces mots doivent être reconnus instantanément. Demander à l'élève de lire chaque mot rapidement.",
        items: ["le", "de", "un", "petit", "papa"],
        variant: "highlight",
      },
    ],
  },
  {
    id: "format_9",
    name: "Template Format 9",
    description: "Sight word reading grid with 15 high-frequency words.",
    sourceWorkshop: 9,
    format: "item_grid_sections",
    instructionsFr: "Demander à l'élève de lire les 15 mots usuels suivants.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire 15 mots usuels",
        promptFr: "Demander à l'élève de lire chaque mot à voix haute.",
        items: [
          "maman",
          "c'est",
          "voici",
          "dit",
          "ami",
          "avec",
          "grand",
          "a",
          "regarde",
          "pour",
          "une",
          "elle",
          "est",
          "il y a",
          "ici",
        ],
        variant: "highlight",
      },
    ],
  },
  {
    id: "format_10",
    name: "Template Format 10",
    description: "Complex grapheme word reading grid for ch, gn, ou, oi, ai, au, eau.",
    sourceWorkshop: 10,
    format: "item_grid_sections",
    instructionsFr:
      "Évaluer la lecture de mots contenant des graphèmes complexes. Demander à l'élève de lire chaque mot à voix haute.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire 10 mots contenant: ch, gn, ou, oi, ai, au, eau",
        promptFr: "Chaque graphème cible doit être représenté au moins une fois.",
        items: [
          "chat",
          "agneau",
          "montagne",
          "oiseau",
          "maison",
          "bateau",
          "soupe",
          "lait",
          "auto",
          "poire",
        ],
      },
    ],
  },
  {
    id: "format_11",
    name: "Template Format 11",
    description: "Word families, ending patterns, and sight word reading sections.",
    sourceWorkshop: 11,
    format: "mixed_reading_sections",
    instructionsFr:
      "Évaluer la capacité de l'élève à lire des familles de mots (variations d'un même mot), des mots avec différentes terminaisons, et des mots usuels.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire et reconnaître des familles de mots",
        promptFr:
          "Demander à l'élève de lire tous les mots de chaque famille et observer s'il reconnaît le lien entre eux.",
        families: [
          ["grand", "grande", "grands", "grandes"],
          ["petit", "petite", "petits", "petites"],
          ["beau", "belle", "beaux", "belles"],
          ["chaud", "chaude", "chauds", "chaudes"],
          ["blanc", "blanche", "blancs", "blanches"],
        ],
      },
      {
        titleFr: "Lire des mots avec les terminaisons fréquentes: -s, -es, -er, -ez, -ait, -aient",
        promptFr: "L'élève doit lire chaque mot en prononçant correctement la terminaison.",
        items: [
          "chats",
          "livres",
          "danser",
          "parlez",
          "jouait",
          "allaient",
          "tables",
          "manger",
          "marchez",
          "parlait",
        ],
      },
      {
        titleFr: "Lire 5 mots usuels",
        promptFr: "Demander à l'élève de lire chaque mot à voix haute.",
        items: ["dans", "mon", "aller", "cherche", "j'aime"],
        variant: "highlight",
      },
    ],
  },
  {
    id: "format_12",
    name: "Template Format 12",
    description: "Repeated sentence fluency criteria and pseudoword decoding grid.",
    sourceWorkshop: 12,
    format: "fluency_sections",
    instructionsFr:
      "Demander à l'élève de lire les phrases à voix haute en respectant la ponctuation et l'intonation, puis de lire les pseudo-mots pour évaluer le décodage.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire 3 phrases répétées avec fluidité",
        promptFr:
          "Demander à l'élève de lire chaque phrase plusieurs fois pour améliorer la fluidité.",
        sentences: [
          "Le chat dort sur le canapé.",
          "Ma maman dort sur le canapé.",
          "L'enfant dort sur le canapé.",
        ],
        criteria: [
          { key: "fluency", labelFr: "Fluidité" },
          { key: "punctuation", labelFr: "Ponctuation" },
          { key: "intonation", labelFr: "Intonation" },
        ],
      },
      {
        titleFr: "Amélioration du débit et de l'exactitude",
        promptFr:
          "Demander à l'élève de lire ces pseudo-mots (mots inventés) pour évaluer ses compétences en décodage.",
        promptShowsInstructionsLabel: true,
        items: ["choui", "groin", "drasse", "ploi", "trouche"],
        variant: "highlight",
      },
    ],
  },
  {
    id: "format_13",
    name: "Template Format 13",
    description: "Advanced grapheme word reading grid for ail, eil, euil, ouil.",
    sourceWorkshop: 13,
    format: "item_grid_sections",
    instructionsFr:
      "Évaluer la lecture de mots contenant des graphèmes avancés (ail, eil, euil, ouil). Demander à l'élève de lire chaque mot à voix haute en identifiant le son cible.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Lire 10 mots contenant: ail, eil, euil, ouil",
        promptFr: "Chaque graphème doit être lu correctement dans le contexte du mot.",
        items: [
          "travail",
          "soleil",
          "réveil",
          "fauteuil",
          "écureuil",
          "grenouille",
          "chandail",
          "appareil",
          "seuil",
          "citrouille",
        ],
      },
    ],
  },
  {
    id: "format_14",
    name: "Template Format 14",
    description: "Teacher-read passage with visualization and comprehension questions.",
    sourceWorkshop: 14,
    format: "comprehension_sections",
    instructionsFr:
      "Demander à l'élève de visualiser l'histoire. Dire : « Ferme les yeux et imagine ce que tu entends pendant que je lis. » Lire le texte à voix haute, puis poser les 5 questions de compréhension.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Texte lu par l'enseignant(e)",
        promptFr: "L'élève ferme les yeux et écoute attentivement pendant la lecture.",
        passageFr:
          "C'est une belle journée d'été. Sophie et son frère Marc vont au parc avec leur chien Félix. Ils apportent un ballon rouge et un pique-nique. Au parc, ils jouent au ballon sur l'herbe verte. Félix court après le ballon et aboie joyeusement. Après le jeu, ils mangent des sandwichs et boivent du jus. Sophie et Marc sont très contents de leur journée au parc. Ils rentrent à la maison fatigués mais heureux.",
      },
      {
        titleFr: "Répondre à 5 questions de compréhension",
        questions: [
          { questionFr: "Où vont Sophie et Marc?", answerFr: "Au parc" },
          { questionFr: "Qui va au parc avec eux?", answerFr: "Leur chien Félix / Félix" },
          { questionFr: "De quelle couleur est le ballon?", answerFr: "Rouge" },
          { questionFr: "Que font-ils après le jeu?", answerFr: "Ils mangent des sandwichs et boivent du jus" },
          { questionFr: "Comment se sentent-ils à la fin?", answerFr: "Fatigués mais heureux" },
        ],
        variant: "highlight",
      },
    ],
  },
  {
    id: "format_15",
    name: "Template Format 15",
    description: "Student autonomous reading passage with fluency mark and comprehension questions.",
    sourceWorkshop: 15,
    format: "comprehension_sections",
    instructionsFr:
      "Demander à l'élève de lire un court texte de 4-5 phrases de façon autonome, puis poser 5 questions de compréhension.",
    bulkActions: ["all_passed", "all_failed", "clear_all", "support_pdf"],
    sections: [
      {
        titleFr: "Texte lu par l'élève (lecture autonome)",
        passageFr:
          "Mon chat s'appelle Minou. Il est noir et blanc avec de grands yeux verts. Minou aime dormir sur mon lit et jouer avec une balle rouge. Tous les matins, il boit du lait dans son bol bleu. C'est mon meilleur ami!",
        fluencyCriterionFr: "Fluidité de lecture",
      },
      {
        titleFr: "Répondre à 5 questions de compréhension",
        questions: [
          { questionFr: "Comment s'appelle le chat?", answerFr: "Minou" },
          { questionFr: "De quelle couleur est le chat?", answerFr: "Noir et blanc" },
          {
            questionFr: "Qu'est-ce que Minou aime faire?",
            answerFr: "Dormir sur le lit et jouer avec une balle rouge",
          },
          { questionFr: "De quelle couleur est son bol?", answerFr: "Bleu" },
          { questionFr: "Quand est-ce que Minou boit du lait?", answerFr: "Tous les matins" },
        ],
        variant: "highlight",
      },
    ],
  },
];

export function getWorkshopTemplate(id: WorkshopTemplateId): WorkshopTemplate {
  const template = WORKSHOP_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown workshop template: ${id}`);
  return template;
}

export const TEMPLATE_DRAFTS_STORAGE_KEY = "admin-workshop-template-drafts";
/** @deprecated Migrated into TEMPLATE_DRAFTS_STORAGE_KEY */
export const TEMPLATE_INSTRUCTIONS_STORAGE_KEY = "admin-workshop-template-instructions";

export function resolveTemplateName(id: WorkshopTemplateId, draft?: TemplateDraft): string {
  const template = getWorkshopTemplate(id);
  const name = draft?.name?.trim();
  return name || template.name;
}

export function defaultTemplateDraft(id: WorkshopTemplateId): TemplateDraft {
  const template = getWorkshopTemplate(id);
  return {
    name: template.name,
    instructionsFr: template.instructionsFr,
    sections: JSON.parse(JSON.stringify(template.sections)) as NonNullable<TemplateDraft["sections"]>,
  };
}

export function defaultTemplateDrafts(): Record<WorkshopTemplateId, TemplateDraft> {
  return Object.fromEntries(
    WORKSHOP_TEMPLATES.map((template) => [template.id, defaultTemplateDraft(template.id)])
  ) as Record<WorkshopTemplateId, TemplateDraft>;
}

export function mergeStoredTemplateDraft(
  id: WorkshopTemplateId,
  stored?: TemplateDraft,
  legacyInstructions?: string
): TemplateDraft {
  const defaults = defaultTemplateDraft(id);
  const template = getWorkshopTemplate(id);

  const storedSections = stored?.sections;
  const sections =
    template.format === "letter_grid"
      ? isLetterGridSections(storedSections)
        ? storedSections
        : defaults.sections
      : template.format === "letter_write_list"
        ? isLetterWriteListSections(storedSections)
          ? storedSections
          : defaults.sections
        : template.format === "checkbox_sections"
          ? isCheckboxTableSections(storedSections)
            ? storedSections
            : defaults.sections
          : template.format === "word_sound_list"
            ? isWordSoundListSections(storedSections)
              ? storedSections
              : defaults.sections
            : template.format === "mixed_sections"
              ? isMixedSections(storedSections)
                ? storedSections
                : defaults.sections
              : template.format === "item_grid_sections"
                ? isItemGridSections(storedSections)
                  ? storedSections
                  : defaults.sections
                : template.format === "mixed_reading_sections"
                  ? isMixedReadingSections(storedSections)
                    ? storedSections
                    : defaults.sections
                  : template.format === "fluency_sections"
                    ? isFluencySections(storedSections)
                      ? storedSections
                      : defaults.sections
                    : template.format === "comprehension_sections"
                      ? isComprehensionSections(storedSections)
                        ? storedSections
                        : defaults.sections
                      : Array.isArray(storedSections) && storedSections.length > 0
                        ? storedSections
                        : defaults.sections;

  return {
    name: stored?.name?.trim() || defaults.name,
    instructionsFr: stored?.instructionsFr ?? legacyInstructions ?? defaults.instructionsFr,
    sections,
  };
}

export function defaultTemplateInstructions(): Record<WorkshopTemplateId, string> {
  return Object.fromEntries(
    WORKSHOP_TEMPLATES.map((template) => [template.id, template.instructionsFr])
  ) as Record<WorkshopTemplateId, string>;
}

function loadLegacyInstructionOverrides(): Partial<Record<WorkshopTemplateId, string>> {
  try {
    const raw = localStorage.getItem(TEMPLATE_INSTRUCTIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<WorkshopTemplateId, string>>;
  } catch {
    return {};
  }
}

export function loadTemplateDrafts(): Partial<Record<WorkshopTemplateId, TemplateDraft>> {
  try {
    const raw = localStorage.getItem(TEMPLATE_DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<WorkshopTemplateId, TemplateDraft>>;
  } catch {
    return {};
  }
}

export function buildTemplateDrafts(): Record<WorkshopTemplateId, TemplateDraft> {
  const stored = loadTemplateDrafts();
  const legacyInstructions = loadLegacyInstructionOverrides();

  return Object.fromEntries(
    WORKSHOP_TEMPLATES.map((template) => [
      template.id,
      mergeStoredTemplateDraft(template.id, stored[template.id], legacyInstructions[template.id]),
    ])
  ) as Record<WorkshopTemplateId, TemplateDraft>;
}

export function saveTemplateDrafts(drafts: Partial<Record<WorkshopTemplateId, TemplateDraft>>): void {
  const complete = buildTemplateDrafts();
  localStorage.setItem(
    TEMPLATE_DRAFTS_STORAGE_KEY,
    JSON.stringify({ ...complete, ...drafts })
  );
}

export function templateDraftsEqual(a: TemplateDraft, b: TemplateDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function loadTemplateInstructionOverrides(): Partial<Record<WorkshopTemplateId, string>> {
  return Object.fromEntries(
    Object.entries(buildTemplateDrafts()).map(([id, draft]) => [id, draft.instructionsFr])
  ) as Partial<Record<WorkshopTemplateId, string>>;
}

export function saveTemplateInstructionOverrides(
  instructions: Partial<Record<WorkshopTemplateId, string>>
): void {
  const drafts = buildTemplateDrafts();
  const next = { ...drafts };
  for (const template of WORKSHOP_TEMPLATES) {
    const override = instructions[template.id];
    if (override !== undefined) {
      next[template.id] = { ...next[template.id], instructionsFr: override };
    }
  }
  saveTemplateDrafts(next);
}