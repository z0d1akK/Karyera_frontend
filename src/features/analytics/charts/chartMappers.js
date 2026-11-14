import { formatGrainDate, scoreToPercent } from '../../../shared/lib/format.js';
import { hoursLabel } from '../../time/api/timeApi.js';

const READINESS_KEYS = {
    '0.00-0.25': 'low',
    '0.25-0.50': 'mid',
    '0.50-0.75': 'high',
    '0.75-1.00': 'top',
};

export const TOP_OPTIONS = [5, 10, 20];
export const LAST_OPTIONS = [12, 24, 36, 0];
export const SCORE_GRAINS = ['DAY', 'MONTH', 'YEAR'];
export const ACTIVITY_GRAINS = ['MONTH', 'YEAR'];

export function readinessName(t, label) {
    const key = READINESS_KEYS[label];
    return key ? t(`analyticsUi.readinessBucket.${key}`) : label;
}

export function grainKey(value, grain = 'DAY') {
    if (!value) {
        return null;
    }
    const day = String(value).slice(0, 10);
    if (day.length < 10) {
        return day;
    }
    if (grain === 'YEAR') {
        return `${day.slice(0, 4)}-01-01`;
    }
    if (grain === 'MONTH') {
        return `${day.slice(0, 7)}-01`;
    }
    return day;
}

export function takeTop(items, limit, key = 'employees') {
    const rows = [...(items || [])].sort((left, right) => Number(right[key] || 0) - Number(left[key] || 0));
    if (!limit) {
        return rows;
    }
    return rows.slice(0, limit);
}

export function takeLast(items, limit) {
    const rows = items || [];
    if (!limit) {
        return rows;
    }
    return rows.slice(Math.max(0, rows.length - limit));
}

export function mapDeficits(items, catalogs) {
    return (items || []).map((item) => ({
        ...item,
        name: item.skillName || catalogs.skills?.find((skill) => skill.id === item.skillId)?.name || item.skillId,
        employees: Number(item.employees || 0),
    }));
}

export function mapReadiness(buckets, t) {
    return (buckets || []).map((item) => ({
        ...item,
        name: readinessName(t, item.label),
        employees: Number(item.employees || 0),
    }));
}

export function mapScorePoints(points, dateKey = 'period', grain = 'DAY') {
    const buckets = new Map();
    for (const item of points || []) {
        const raw = item[dateKey] || item.calculatedAt || item.period;
        const key = grainKey(raw, grain);
        if (!key) {
            continue;
        }
        const current = buckets.get(key) || { period: key, scores: [], assessments: 0 };
        const score = item.averageScore ?? item.totalScore;
        if (score != null) {
            current.scores.push(Number(score));
        }
        current.assessments += Number(item.assessments || 1);
        buckets.set(key, current);
    }
    return [...buckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, item]) => {
            const average = item.scores.length
                ? item.scores.reduce((sum, value) => sum + value, 0) / item.scores.length
                : 0;
            return {
                period: item.period,
                assessments: item.assessments,
                averageScore: average,
                label: formatGrainDate(item.period, grain),
                score: Math.round(scoreToPercent(average) ?? 0),
            };
        });
}

export function mapActivity(points, grain = 'MONTH') {
    return (points || []).map((item) => ({
        ...item,
        label: formatGrainDate(item.periodStart, grain),
        hours: Number(hoursLabel(item.approvedMinutes)),
        tasks: Number(item.completedTasks || 0),
    }));
}

export function mapDepartments(items, catalogs, unknownLabel) {
    return (items || []).map((item) => ({
        ...item,
        name: item.departmentId
            ? (catalogs.departments?.find((department) => department.id === item.departmentId)?.name || item.departmentId)
            : unknownLabel,
        score: Math.round(scoreToPercent(item.averageScore) ?? 0),
        employees: Number(item.assessedEmployees || 0),
    }));
}

export function mapRadar(gaps, catalogs) {
    return (gaps || []).slice(0, 8).map((item) => ({
        name: catalogs.skills?.find((skill) => skill.id === item.skillId)?.name || '—',
        actual: Number(item.actualLevel || 0),
        required: Number(item.requiredLevel || 0),
    }));
}

export function inPeriod(value, from, to) {
    if (!value) {
        return true;
    }
    const day = String(value).slice(0, 10);
    if (from && day < from) {
        return false;
    }
    if (to && day > to) {
        return false;
    }
    return true;
}
