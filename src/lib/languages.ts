/** Languages a learner can get translations and explanations in. */
export const LANGUAGES = [
  { code: "en", name: "English", english: "English" },
  { code: "uk", name: "Українська", english: "Ukrainian" },
  { code: "ru", name: "Русский", english: "Russian" },
  { code: "pl", name: "Polski", english: "Polish" },
  { code: "lt", name: "Lietuvių", english: "Lithuanian" },
  { code: "ar", name: "العربية", english: "Arabic", rtl: true },
  { code: "fa", name: "فارسی / دری", english: "Persian (Farsi/Dari)", rtl: true },
  { code: "ti", name: "ትግርኛ", english: "Tigrinya" },
  { code: "so", name: "Soomaali", english: "Somali" },
  { code: "tr", name: "Türkçe", english: "Turkish" },
  { code: "es", name: "Español", english: "Spanish" },
  { code: "ro", name: "Română", english: "Romanian" },
  { code: "th", name: "ไทย", english: "Thai" },
  { code: "tl", name: "Filipino", english: "Filipino (Tagalog)" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function isLanguage(code: unknown): code is LanguageCode {
  return typeof code === "string" && (LANGUAGE_CODES as string[]).includes(code);
}

export function languageInfo(code: LanguageCode) {
  return LANGUAGES.find((l) => l.code === code)!;
}

export function isRtl(code: LanguageCode): boolean {
  const info = languageInfo(code);
  return "rtl" in info && info.rtl;
}

/** lang and dir for text written in a learner's language; Norwegian when there is none. */
export function textLang(lang: string | undefined) {
  return isLanguage(lang) ? { lang, dir: isRtl(lang) ? ("rtl" as const) : ("ltr" as const) } : { lang: "nb" };
}

/** The first of the browser's languages we support, or English. */
export function browserLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase().split("-")[0];
    if (isLanguage(code)) return code;
  }
  return "en";
}
