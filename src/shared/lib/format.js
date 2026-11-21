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

export function localTodayIso(now = new Date()) {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

export function utcTodayIso(now = new Date()) {
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}-${day}`;
}

export function utcWeekRange(now = new Date()) {
    const weekday = now.getUTCDay() || 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday + 1));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    return { periodStart: utcTodayIso(monday), periodEnd: utcTodayIso(sunday) };
}

export function utcMonthStart(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function shiftUtcMonth(cursor, delta) {
    return new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + delta, 1));
}

function utcDate(value) {
    if (value instanceof Date) {
        return value;
    }
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }
    return parseISO(raw);
}

function formatUtc(date, pattern, language) {
    const shifted = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    );
    return format(shifted, pattern, { locale: locales[language] || ru });
}

export function formatUtcMonth(value, language = currentLang()) {
    const lang = String(language || currentLang()).startsWith('en') ? 'en' : 'ru';
    return formatUtc(utcDate(value), 'LLLL yyyy', lang);
}

export function formatDate(value, language = currentLang()) {
    if (!value) {
        return '—';
    }

    try {
        return formatUtc(utcDate(value), 'dd.MM.yyyy', language);
    } catch {
        return String(value);
    }
}

export function formatGrainDate(value, grain = 'DAY', language = currentLang()) {
    if (!value) {
        return '—';
    }
    try {
        const date = utcDate(String(value).slice(0, 10));
        if (grain === 'YEAR') {
            return formatUtc(date, 'yyyy', language);
        }
        if (grain === 'MONTH') {
            return formatUtc(date, 'LLL yyyy', language);
        }
        return formatUtc(date, 'dd.MM.yyyy', language);
    } catch {
        return formatDate(value, language);
    }
}

export function timezoneOffsetMinutes() {
    return 0;
}

export function timezoneOffsetLabel() {
    return 'UTC';
}

export function formatDateTime(value, language = currentLang()) {
    if (!value) {
        return '—';
    }

    try {
        return `${formatUtc(utcDate(value), 'dd.MM.yyyy HH:mm', language)} UTC`;
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
        return formatUtc(utcDate(value), 'LLLL yyyy', language);
    } catch {
        return String(value);
    }
}
