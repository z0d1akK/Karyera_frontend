import { format, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

import i18n from '../../i18n/index.jsx';

const locales = { ru, en: enUS };

function currentLang() {
    const language = i18n.resolvedLanguage || i18n.language || 'ru';
    return language.startsWith('en') ? 'en' : 'ru';
}

export function fullName(person) {
    if (!person) {
        return '—';
    }

    return [person.lastName, person.firstName, person.middleName].filter(Boolean).join(' ') || '—';
}

export function formatDate(value, language = currentLang()) {
    if (!value) {
        return '—';
    }

    try {
        const date = typeof value === 'string' ? parseISO(value) : value;
        return format(date, 'dd.MM.yyyy', { locale: locales[language] || ru });
    } catch {
        return String(value);
    }
}

export function timezoneOffsetMinutes() {
    return -new Date().getTimezoneOffset();
}

export function timezoneOffsetLabel() {
    const minutes = timezoneOffsetMinutes();
    const sign = minutes >= 0 ? '+' : '-';
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const rest = absolute % 60;
    return rest ? `UTC${sign}${hours}:${String(rest).padStart(2, '0')}` : `UTC${sign}${hours}`;
}

export function formatDateTime(value, language = currentLang()) {
    if (!value) {
        return '—';
    }

    try {
        const date = typeof value === 'string' ? parseISO(value) : value;
        return format(date, 'dd.MM.yyyy HH:mm', { locale: locales[language] || ru });
    } catch {
        return String(value);
    }
}

export function catalogName(item) {
    return item?.name || '—';
}

export function valueOrDash(value) {
    if (value === null || value === undefined || value === '') {
        return i18n.t('common.notSpecified');
    }
    return String(value);
}

export function formatMonthYear(value, language = currentLang()) {
    if (!value) {
        return i18n.t('common.notSpecified');
    }

    try {
        const date = typeof value === 'string' ? parseISO(value) : value;
        return format(date, 'LLLL yyyy', { locale: locales[language] || ru });
    } catch {
        return String(value);
    }
}
