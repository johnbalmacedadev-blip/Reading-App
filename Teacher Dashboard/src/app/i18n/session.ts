import type { Lang } from "./lang";

export const LANG_STORAGE_KEY = "lecture-portal-lang";
export const LANG_SESSION_KEY = "lecture-portal-lang-session";

export function readPersistedLang(): Lang {
  if (typeof window === "undefined") return "en";
  const fromSession = sessionStorage.getItem(LANG_SESSION_KEY);
  const fromLocal = localStorage.getItem(LANG_STORAGE_KEY);
  const value = fromSession ?? fromLocal;
  return value === "fr" || value === "en" ? value : "en";
}

export function persistLang(lang: Lang): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  sessionStorage.setItem(LANG_SESSION_KEY, lang);
}
