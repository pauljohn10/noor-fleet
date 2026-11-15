import React, { createContext, useContext, useState, useEffect } from 'react';
import { lookupTranslation, Language } from '../i18n/translations';

export type { Language };
export type Direction = 'ltr' | 'rtl';

export interface I18nContextType {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_LANG_KEY = 'noor_fleet_language';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      return saved === 'ar' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  useEffect(() => {
    try {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
      localStorage.setItem(STORAGE_LANG_KEY, language);
    } catch (e) {
      console.warn('Unable to persist language:', e);
    }
  }, [direction, language]);

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    return lookupTranslation(key, language, fallback);
  };

  return (
    <I18nContext.Provider value={{ language, direction, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
