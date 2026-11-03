import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';

const STORAGE_KEY = 'karyera-lang';

const storedLanguage = localStorage.getItem(STORAGE_KEY) || 'ru';

i18n.use(initReactI18next).init({
    resources: {
        ru: {
            translation: ru,
        },
        en: {
            translation: en,
        },
    },

    lng: storedLanguage,

    fallbackLng: 'en',

    interpolation: {
        escapeValue: false,
    },
});

document.documentElement.lang = storedLanguage;

i18n.on('languageChanged', (language) => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
});

export default i18n;
