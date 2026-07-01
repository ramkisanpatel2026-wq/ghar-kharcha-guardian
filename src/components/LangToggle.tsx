import { useTranslation } from "react-i18next";
import { setLang } from "@/lib/i18n";

export function LangToggle() {
  const { i18n } = useTranslation();
  const cur = i18n.language;
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-border bg-card text-xs">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 font-medium transition ${
          cur === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        className={`px-3 py-1.5 font-medium transition ${
          cur === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        हिं
      </button>
    </div>
  );
}
