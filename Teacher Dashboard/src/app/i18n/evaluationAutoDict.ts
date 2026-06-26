import type { AutoTranslationEntry } from "./autoTranslate";

/** Bilingual content for evaluation workshops — used by the auto-translate plugin. */
export const evaluationAutoDict: AutoTranslationEntry[] = [
  // ── Atelier 1 ──────────────────────────────────────────────────────────────
  {
    fr: "Présenter chaque lettre majuscule à l'élève et demander : \"Quel est le nom de cette lettre ?\" puis \"Quel son fait cette lettre ?\"",
    en: "Present each uppercase letter to the student and ask: \"What is the name of this letter?\" then \"What sound does this letter make?\"",
  },
  { fr: "Lettres majuscules", en: "Uppercase letters" },

  // ── Atelier 2 ──────────────────────────────────────────────────────────────
  {
    fr: "Présenter chaque lettre minuscule à l'élève et demander : \"Quel est le nom de cette lettre ?\" puis \"Quel son fait cette lettre ?\"",
    en: "Present each lowercase letter to the student and ask: \"What is the name of this letter?\" then \"What sound does this letter make?\"",
  },
  { fr: "Lettres minuscules", en: "Lowercase letters" },

  // ── Atelier 3 ──────────────────────────────────────────────────────────────
  {
    fr: "Dire le nom de chaque lettre majuscule à l'élève et lui demander de l'écrire.",
    en: "Say the name of each uppercase letter to the student and ask them to write it.",
  },
  { fr: "Écrire les lettres majuscules", en: "Write uppercase letters" },

  // ── Atelier 4 ──────────────────────────────────────────────────────────────
  {
    fr: "Dire le nom de chaque lettre minuscule à l'élève et lui demander de l'écrire.",
    en: "Say the name of each lowercase letter to the student and ask them to write it.",
  },
  { fr: "Écrire les lettres minuscules", en: "Write lowercase letters" },

  // ── Atelier 5 ──────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la capacité de l'élève à identifier les rimes, segmenter/fusionner et compter les syllabes. Pour chaque section, demander à l'élève d'écouter attentivement et de répondre.",
    en: "Assess the student's ability to identify rhymes, segment/blend, and count syllables. For each section, ask the student to listen carefully and respond.",
  },
  { fr: "Identifier des mots qui riment", en: "Identify rhyming words" },
  { fr: "Demander à l'élève : « Est-ce que ces mots riment? »", en: "Ask the student: \"Do these words rhyme?\"" },
  { fr: "Paire de mots", en: "Word pair" },
  { fr: "Réponse correcte", en: "Correct answer" },
  { fr: "Réussi", en: "Passed" },
  { fr: "Oui", en: "Yes" },
  { fr: "Non", en: "No" },
  { fr: "Segmenter et fusionner des syllabes", en: "Segment and blend syllables" },
  { fr: "Lire le mot segmenté. Demander à l'élève : « Quel mot est-ce que ça fait? »", en: "Read the segmented word. Ask the student: \"What word does that make?\"" },
  { fr: "Mot segmenté", en: "Segmented word" },
  { fr: "Mot complet", en: "Full word" },
  { fr: "Compter les syllabes dans un mot", en: "Count syllables in a word" },
  {
    fr: "Dire le mot à l'élève. Demander : « Combien de syllabes entends-tu dans ce mot? » L'élève doit vous dire le nombre.",
    en: "Say the word to the student. Ask: \"How many syllables do you hear in this word?\" The student should tell you the number.",
  },
  { fr: "Mot", en: "Word" },
  { fr: "Nombre de syllabes", en: "Number of syllables" },

  // ── Atelier 6 ──────────────────────────────────────────────────────────────
  {
    fr: "Demander à l'élève d'identifier les sons au début et à la fin des mots. Dire le mot clairement et demander : « Quel son entends-tu au début/à la fin? »",
    en: "Ask the student to identify sounds at the beginning and end of words. Say the word clearly and ask: \"What sound do you hear at the beginning/end?\"",
  },
  { fr: "Identifier le son au début d'un mot", en: "Identify the sound at the beginning of a word" },
  { fr: "Identifier le son à la fin d'un mot", en: "Identify the sound at the end of a word" },

  // ── Atelier 7 ──────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la lecture de syllabes simples et la correspondance son-lettre. Pour la section correspondance, montrer 3 lettres à l'élève et demander de pointer la lettre qui fait le son indiqué.",
    en: "Assess simple syllable reading and sound-letter correspondence. For the correspondence section, show 3 letters to the student and ask them to point to the letter that makes the indicated sound.",
  },
  { fr: "Lire des syllabes CV, VC et CVC", en: "Read CV, VC, and CVC syllables" },
  { fr: "Demander à l'élève de lire chaque syllabe.", en: "Ask the student to read each syllable." },
  { fr: "Associer les sons aux graphèmes correspondants", en: "Match sounds to corresponding graphemes" },
  {
    fr: "Montrer 3 lettres à l'élève. Dire : « Pointe la lettre qui fait le son /___/. » Par exemple, montrer « b – f – l » et demander : « Pointe la lettre qui fait le son /f/. »",
    en: "Show 3 letters to the student. Say: \"Point to the letter that makes the sound /___/.\" For example, show \"b – f – l\" and ask: \"Point to the letter that makes the sound /f/.\"",
  },
  { fr: "Lettres montrées", en: "Letters shown" },
  { fr: "Son demandé", en: "Sound requested" },
  { fr: "Lettre correcte", en: "Correct letter" },

  // ── Atelier 8 ──────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la lecture de différents types de syllabes et de mots usuels.",
    en: "Assess reading of different syllable types and high-frequency words.",
  },
  { fr: "Lire des syllabes ouvertes et fermées", en: "Read open and closed syllables" },
  { fr: "Demander à l'élève de lire chaque syllabe à voix haute.", en: "Ask the student to read each syllable aloud." },
  { fr: "Lire des syllabes complexes - CVCC, CCVC", en: "Read complex syllables — CVCC, CCVC" },
  { fr: "Demander à l'élève de lire chaque syllabe complexe à voix haute.", en: "Ask the student to read each complex syllable aloud." },
  { fr: "Lire 5 mots usuels", en: "Read 5 high-frequency words" },
  {
    fr: "Ces mots doivent être reconnus instantanément. Demander à l'élève de lire chaque mot rapidement.",
    en: "These words should be recognized instantly. Ask the student to read each word quickly.",
  },

  // ── Atelier 9 ──────────────────────────────────────────────────────────────
  {
    fr: "Demander à l'élève de lire les 15 mots usuels suivants.",
    en: "Ask the student to read the following 15 high-frequency words.",
  },
  { fr: "Lire 15 mots usuels", en: "Read 15 high-frequency words" },

  // ── Atelier 10 ─────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la lecture de mots contenant des graphèmes complexes. Demander à l'élève de lire chaque mot à voix haute.",
    en: "Assess reading of words containing complex graphemes. Ask the student to read each word aloud.",
  },
  { fr: "Lire 10 mots contenant: ch, gn, ou, oi, ai, au, eau", en: "Read 10 words containing: ch, gn, ou, oi, ai, au, eau" },
  { fr: "Chaque graphème cible doit être représenté au moins une fois.", en: "Each target grapheme must be represented at least once." },

  // ── Atelier 11 ─────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la capacité de l'élève à lire des familles de mots (variations d'un même mot), des mots avec différentes terminaisons, et des mots usuels.",
    en: "Assess the student's ability to read word families (variations of the same word), words with different endings, and high-frequency words.",
  },
  { fr: "Lire et reconnaître des familles de mots", en: "Read and recognize word families" },
  {
    fr: "Demander à l'élève de lire tous les mots de chaque famille et observer s'il reconnaît le lien entre eux.",
    en: "Ask the student to read all words in each family and observe whether they recognize the connection between them.",
  },
  {
    fr: "Lire des mots avec les terminaisons fréquentes: -s, -es, -er, -ez, -ait, -aient",
    en: "Read words with common endings: -s, -es, -er, -ez, -ait, -aient",
  },
  { fr: "L'élève doit lire chaque mot en prononçant correctement la terminaison.", en: "The student must read each word with the ending pronounced correctly." },

  // ── Atelier 12 ─────────────────────────────────────────────────────────────
  {
    fr: "Demander à l'élève de lire les phrases à voix haute en respectant la ponctuation et l'intonation, puis de lire les pseudo-mots pour évaluer le décodage.",
    en: "Ask the student to read sentences aloud with correct punctuation and intonation, then read pseudowords to assess decoding.",
  },
  { fr: "Lire 3 phrases répétées avec fluidité", en: "Read 3 repeated sentences with fluency" },
  { fr: "Demander à l'élève de lire chaque phrase plusieurs fois pour améliorer la fluidité.", en: "Ask the student to read each sentence several times to improve fluency." },
  { fr: "Fluidité", en: "Fluency" },
  { fr: "Ponctuation", en: "Punctuation" },
  { fr: "Intonation", en: "Intonation" },
  { fr: "Amélioration du débit et de l'exactitude", en: "Rate and accuracy improvement" },
  {
    fr: "Demander à l'élève de lire ces pseudo-mots (mots inventés) pour évaluer ses compétences en décodage.",
    en: "Ask the student to read these pseudowords (made-up words) to assess their decoding skills.",
  },

  // ── Atelier 13 ─────────────────────────────────────────────────────────────
  {
    fr: "Évaluer la lecture de mots contenant des graphèmes avancés (ail, eil, euil, ouil). Demander à l'élève de lire chaque mot à voix haute en identifiant le son cible.",
    en: "Assess reading of words containing advanced graphemes (ail, eil, euil, ouil). Ask the student to read each word aloud while identifying the target sound.",
  },
  { fr: "Lire 10 mots contenant: ail, eil, euil, ouil", en: "Read 10 words containing: ail, eil, euil, ouil" },
  { fr: "Chaque graphème doit être lu correctement dans le contexte du mot.", en: "Each grapheme must be read correctly in the context of the word." },

  // ── Atelier 14 ─────────────────────────────────────────────────────────────
  {
    fr: "Demander à l'élève de visualiser l'histoire. Dire : « Ferme les yeux et imagine ce que tu entends pendant que je lis. » Lire le texte à voix haute, puis poser les 5 questions de compréhension.",
    en: "Ask the student to visualize the story. Say: \"Close your eyes and imagine what you hear as I read.\" Read the text aloud, then ask the 5 comprehension questions.",
  },
  { fr: "Texte lu par l'enseignant(e)", en: "Text read by the teacher" },
  { fr: "L'élève ferme les yeux et écoute attentivement pendant la lecture.", en: "The student closes their eyes and listens carefully during the reading." },
  { fr: "Répondre à 5 questions de compréhension", en: "Answer 5 comprehension questions" },
  { fr: "Où vont Sophie et Marc?", en: "Where do Sophie and Marc go?" },
  { fr: "Au parc", en: "To the park" },
  { fr: "Qui va au parc avec eux?", en: "Who goes to the park with them?" },
  { fr: "Leur chien Félix / Félix", en: "Their dog Félix / Félix" },
  { fr: "De quelle couleur est le ballon?", en: "What colour is the ball?" },
  { fr: "Rouge", en: "Red" },
  { fr: "Que font-ils après le jeu?", en: "What do they do after playing?" },
  { fr: "Ils mangent des sandwichs et boivent du jus", en: "They eat sandwiches and drink juice" },
  { fr: "Comment se sentent-ils à la fin?", en: "How do they feel at the end?" },
  { fr: "Fatigués mais heureux", en: "Tired but happy" },

  // ── Atelier 15 ─────────────────────────────────────────────────────────────
  {
    fr: "Demander à l'élève de lire un court texte de 4-5 phrases de façon autonome, puis poser 5 questions de compréhension.",
    en: "Ask the student to read a short 4–5 sentence text independently, then ask 5 comprehension questions.",
  },
  { fr: "Texte lu par l'élève (lecture autonome)", en: "Text read by the student (independent reading)" },
  { fr: "Fluidité de lecture", en: "Reading fluency" },
  { fr: "Comment s'appelle le chat?", en: "What is the cat's name?" },
  { fr: "Minou", en: "Minou" },
  { fr: "De quelle couleur est le chat?", en: "What colour is the cat?" },
  { fr: "Noir et blanc", en: "Black and white" },
  { fr: "Qu'est-ce que Minou aime faire?", en: "What does Minou like to do?" },
  { fr: "Dormir sur le lit et jouer avec une balle rouge", en: "Sleep on the bed and play with a red ball" },
  { fr: "De quelle couleur est son bol?", en: "What colour is his bowl?" },
  { fr: "Bleu", en: "Blue" },
  { fr: "Quand est-ce que Minou boit du lait?", en: "When does Minou drink milk?" },
  { fr: "Tous les matins", en: "Every morning" },

  // ── Comprehension answer prefix ────────────────────────────────────────────
  { fr: "[Réponse:", en: "[Answer:" },
];
