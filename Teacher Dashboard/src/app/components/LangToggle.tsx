import { useLanguage } from "../i18n";

type LangToggleProps = {
  className?: string;
};

export function LangToggle({ className = "mb-3" }: LangToggleProps) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={`flex items-center rounded-lg overflow-hidden ${className}`}
      style={{ border: "1px solid #dff3ff" }}
    >
      <button
        onClick={() => setLang("fr")}
        className="flex-1 py-1.5 text-sm font-bold transition-all"
        style={{
          background: lang === "fr" ? "#004aad" : "transparent",
          color: lang === "fr" ? "#ffffff" : "#888",
        }}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className="flex-1 py-1.5 text-sm font-bold transition-all"
        style={{
          background: lang === "en" ? "#004aad" : "transparent",
          color: lang === "en" ? "#ffffff" : "#888",
        }}
      >
        EN
      </button>
    </div>
  );
}
