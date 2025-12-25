import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Load translation using http -> see /public/locales
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    fallbackLng: 'vi',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },

    backend: {
      // Path where translation files are located
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Available languages
    supportedLngs: ['en', 'vi'],

    // Default namespace
    defaultNS: 'common',

    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
