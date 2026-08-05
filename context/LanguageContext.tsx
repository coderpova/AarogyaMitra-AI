"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { t as translate } from "@/lib/i18n";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getSpeechLang, LanguageOption } from "@/locales";
import { useAuth } from "./AuthContext";

interface LanguageContextType {
  language: string;
  speechLang: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Initialize language from local storage or logged-in user settings
  useEffect(() => {
    const initLanguage = () => {
      // 1. Check logged-in user settings in MongoDB/AuthContext
      if ((user as any)?.settings?.language) {
        const userLang = (user as any).settings.language;
        setLanguageState(userLang);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, userLang);
        return;
      }

      // 2. Check localStorage
      const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang && SUPPORTED_LANGUAGES.some((l) => l.code === storedLang)) {
        setLanguageState(storedLang);
        return;
      }

      // 3. Fallback to default "en"
      setLanguageState(DEFAULT_LANGUAGE);
    };

    initLanguage();
  }, [user]);

  // Listen for language-change events across components
  useEffect(() => {
    const handleLangChange = () => {
      const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang && storedLang !== language) {
        setLanguageState(storedLang);
      }
    };

    window.addEventListener("language-change", handleLangChange);
    return () => window.removeEventListener("language-change", handleLangChange);
  }, [language]);

  // Change language function
  const setLanguage = async (newLang: string) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) return;

    // 1. Update React state & localStorage immediately for instant UI response
    setLanguageState(newLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    window.dispatchEvent(new Event("language-change"));

    // 2. If user is authenticated, save to MongoDB
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token) {
      try {
        const res = await fetch("/api/user/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: newLang }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            // Update local user state & notify auth context
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              parsedUser.settings = {
                ...(parsedUser.settings || {}),
                language: newLang,
              };
              localStorage.setItem("user", JSON.stringify(parsedUser));
              window.dispatchEvent(new Event("auth-change"));
            }
          }
        }
      } catch (err) {
        console.error("Failed to save language preference to DB:", err);
      }
    }
  };

  // Translation function bound to current language
  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>) => {
      return translate(language, keyPath, params);
    },
    [language]
  );

  const speechLang = getSpeechLang(language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        speechLang,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
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
