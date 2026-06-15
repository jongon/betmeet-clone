"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getDictionary } from "./get-dictionary";
import type { Dictionary } from "./types";

interface DictionaryContextValue {
  dictionary: Dictionary;
  locale: Locale;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  children,
  dictionary,
  locale,
}: Readonly<{
  children: React.ReactNode;
  dictionary: Dictionary;
  locale: Locale;
}>) {
  return (
    <DictionaryContext.Provider value={{ dictionary, locale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const value = useContext(DictionaryContext);
  return value?.dictionary ?? getDictionary(DEFAULT_LOCALE);
}

export function useLocale() {
  const value = useContext(DictionaryContext);
  return value?.locale ?? DEFAULT_LOCALE;
}
