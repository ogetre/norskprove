"use client";

import { browserLanguage, isLanguage, type LanguageCode } from "./languages";
import { saveProfile, useAppState, useHydrated } from "./store";

/** The learner's language for translations: chosen in the profile, else the browser's. */
export function useNativeLanguage(): [LanguageCode, (code: LanguageCode) => void] {
  const saved = useAppState().profile.nativeLanguage;
  const hydrated = useHydrated();
  const lang = isLanguage(saved) ? saved : hydrated ? browserLanguage() : "en";
  return [lang, (code) => saveProfile({ nativeLanguage: code })];
}
