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

export function formatGrainDate(value, grain = 'DAY', language = currentLang()) {
    if (!value) {
        return '—';
    }
    try {
        const raw = typeof value === 'string' ? value : value.toISOString?.() || String(value);
        const date = parseISO(String(raw).slice(0, 10));
        const locale = locales[language] || ru;
        if (grain === 'YEAR') {
            return format(date, 'yyyy', { locale });
        }
        if (grain === 'MONTH') {
            return format(date, 'LLL yyyy', { locale });
        }
        return format(date, 'dd.MM.yyyy', { locale });
    } catch {
        return formatDate(value, language);
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

export function scoreToPercent(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return null;
    }
    return number <= 1 ? number * 100 : number;
}

export function formatScorePercent(value) {
    const percent = scoreToPercent(value);
    return percent == null ? '—' : `${Math.round(percent)}%`;
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
