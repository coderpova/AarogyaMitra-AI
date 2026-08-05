import { en, TranslationKeys } from "./en";
import { hi } from "./hi";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    speechLang: "en-IN",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    speechLang: "hi-IN",
  },
  // Future ready: easily add Tamil, Telugu, Gujarati, Marathi, Bengali, Kannada, Malayalam here!
];

export const translations: Record<string, TranslationKeys> = {
  en,
  hi,
};

export const DEFAULT_LANGUAGE = "en";

export function getSpeechLang(langCode: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  return lang ? lang.speechLang : "en-IN";
}
