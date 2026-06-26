import { useLanguage } from "../i18n";

type AutoTextProps = {
  text: string;
};

/** Renders text through the auto-translate plugin for the active language session. */
export function AutoText({ text }: AutoTextProps) {
  const { auto } = useLanguage();
  return <>{auto(text)}</>;
}
