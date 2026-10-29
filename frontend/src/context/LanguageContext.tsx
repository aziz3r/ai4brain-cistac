"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import enTranslations from "../locales/en.json";
import frTranslations from "../locales/fr.json";

export type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
}

const translations: Record<Language, any> = {
  en: enTranslations,
  fr: frTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai4brain_lang") as Language;
      if (saved === "en" || saved === "fr") {
        setLanguageState(saved);
      } else if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("fr")) {
        setLanguageState("fr");
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("ai4brain_lang", lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      const keys = key.split(".");
      let val: any = dict;

      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = val[k];
        } else {
          // Fallback to English
          let fallbackVal: any = translations.en;
          for (const fbK of keys) {
            if (fallbackVal && typeof fallbackVal === "object" && fbK in fallbackVal) {
              fallbackVal = fallbackVal[fbK];
            } else {
              fallbackVal = null;
              break;
            }
          }
          val = fallbackVal;
          break;
        }
      }

      if (val === null || val === undefined) {
        return key;
      }

      let res = Array.isArray(val) ? val.join(", ") : String(val);
      if (params) {
        Object.entries(params).forEach(([pk, pv]) => {
          res = res.replace(new RegExp(`\\{${pk}\\}`, "g"), String(pv));
        });
      }
      return res;
    };
  }, [language]);

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
    const locale = language === "fr" ? "fr-FR" : "en-US";
    return new Intl.NumberFormat(locale, options).format(value);
  };

  const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const locale = language === "fr" ? "fr-FR" : "en-US";
    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatNumber, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}