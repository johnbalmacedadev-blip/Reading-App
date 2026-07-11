import type { Lang } from "./lang";
import { evaluationAutoDict } from "./evaluationAutoDict";
import { pageAutoDict } from "./pageAutoDict";

export type AutoTranslationEntry = { fr: string; en: string };

const extensionRegistry: AutoTranslationEntry[] = [];

/** Register extra FR/EN pairs for the auto-translate plugin. */
export function registerAutoTranslations(entries: AutoTranslationEntry[]): void {
  extensionRegistry.push(...entries);
}

function buildFrenchToEnglishMap(): Map<string, string> {
  const map = new Map<string, string>();

  const add = (fr: string, en: string) => {
    if (fr && en && fr !== en) map.set(fr, en);
  };

  for (const entry of pageAutoDict) {
    add(entry.fr, entry.en);
  }
  for (const entry of evaluationAutoDict) {
    add(entry.fr, entry.en);
  }
  for (const entry of extensionRegistry) {
    add(entry.fr, entry.en);
  }

  return map;
}

let cachedMap: Map<string, string> | null = null;

function getMap(): Map<string, string> {
  if (!cachedMap) cachedMap = buildFrenchToEnglishMap();
  return cachedMap;
}

/** Invalidate cache when new translations are registered at runtime. */
export function resetAutoTranslateCache(): void {
  cachedMap = null;
}

/**
 * Auto-translate plugin: pass a French source string, get the English equivalent
 * when lang is "en". Unknown strings pass through unchanged.
 */
export function autoTranslate(text: string, lang: Lang): string {
  if (lang === "fr" || !text) return text;
  const exact = getMap().get(text);
  if (exact) return exact;
  return text
    .replace(/\bAteliers\b/g, "Workshops")
    .replace(/\bAtelier\b/g, "Workshop")
    .replace(/\bateliers\b/g, "workshops")
    .replace(/\batelier\b/g, "workshop");
}

/** Merge i18n translation table into the auto-translate map. */
export function registerFromI18nTable(
  table: Record<string, { fr: string; en: string }>
): void {
  const entries = Object.values(table).map(({ fr, en }) => ({ fr, en }));
  registerAutoTranslations(entries);
  resetAutoTranslateCache();
}
