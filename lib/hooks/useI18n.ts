import { useState, useEffect } from 'react';
import { PreferencesService } from '../services/preferences';
import { TRANSLATIONS } from '../i18n/translations';
import { Language } from '../../types';
import { TranslationLoader, SupportedLanguage } from '../services/translationLoader';

// Global cache to share translations between hook instances and ReportGenerator
export const translationCache: Record<string, Record<string, string>> = { ...TRANSLATIONS };

export const useI18n = () => {
  const [language, setLanguage] = useState<Language>('en');
  // Initialize with the cache
  const [translations, setTranslations] = useState<Record<string, string>>(translationCache['en']);

  useEffect(() => {
    // Initial load
    const prefs = PreferencesService.getPreferences();
    loadLanguage(prefs.language);

    // Listen for changes
    const handlePrefsChange = () => {
      const newPrefs = PreferencesService.getPreferences();
      loadLanguage(newPrefs.language);
    };

    window.addEventListener('prefs-updated', handlePrefsChange);
    return () => window.removeEventListener('prefs-updated', handlePrefsChange);
  }, []);

  const loadLanguage = async (lang: Language) => {
    setLanguage(lang);

    // 1. Check Cache first (includes static bundles)
    if (translationCache[lang]) {
        setTranslations(translationCache[lang]);
        
        // If it's a partial bundle (only static), we might want to try enriching it?
        // For now, assume cache is authoritative if present.
        return;
    }

    // 2. Fetch external packs via TranslationLoader
    // We fall back to English UI while loading
    setTranslations(translationCache['en']); 
    
    const external = await TranslationLoader.load(lang as SupportedLanguage);
    if (external) {
        translationCache[lang] = { ...translationCache['en'], ...external }; // Merge with EN as fallback
        setTranslations(translationCache[lang]);
    } else {
        // If fetch fails, fallback to EN
        translationCache[lang] = translationCache['en'];
        setTranslations(translationCache['en']);
    }
  };

  const t = (key: string, defaultText?: string) => {
    return translations[key as keyof typeof translations] || defaultText || key;
  };

  return { t, language };
};
