import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';

const normalizeLanguage = (language?: string) => language?.startsWith('vi') ? 'vi' : 'en';

const syncDocumentLanguage = (language?: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const normalizedLanguage = normalizeLanguage(language);

  document.documentElement.lang = normalizedLanguage;

  if (normalizedLanguage === 'vi') {
    document.documentElement.style.setProperty('--font-sans', 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif');
    document.documentElement.style.setProperty('--font-mono', 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace');
    return;
  }

  document.documentElement.style.removeProperty('--font-sans');
  document.documentElement.style.removeProperty('--font-mono');
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
