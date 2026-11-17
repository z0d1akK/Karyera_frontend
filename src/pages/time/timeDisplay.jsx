import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatHours, minutesDelta } from '../../features/time/api/timeApi.js';
import { NamedLink } from '../../shared/ui/NamedLink/NamedLink.jsx';
import styles from './TimePages.module.css';

export function Missing({ children }) {
    return <span className={styles.missing}>{children}</span>;
}

export function ProjectCell({ row, labels }) {
    const { t } = useTranslation();
    const name = row.projectName || labels.projectName(row.projectId);
    if (name) {
        return <NamedLink to={row.projectId ? `/app/projects/${row.projectId}` : null} name={name} />;
    }
    return <Missing>{row.projectId ? t('time.projectUnknown') : t('time.projectMissing')}</Missing>;
}

export function TaskCell({ row, labels }) {
    const { t } = useTranslation();
    const name = row.taskTitle || labels.taskTitle(row.taskId);
    if (name) {
        return <NamedLink to={row.taskId ? `/app/tasks/${row.taskId}` : null} name={name} />;
    }
    return <Missing>{row.taskId ? t('time.taskUnknown') : t('time.taskMissing')}</Missing>;
}

export function EmployeeCell({ id, name }) {
    const { t } = useTranslation();
    if (!id) {
        return <Missing>{t('time.employeeUnknown')}</Missing>;
    }
    return (
        <NamedLink
            to={`/app/employees/${id}`}
            name={name || t('time.employeeUnknown')}
        />
    );
}

export function periodLabel(formatDate, start, end) {
    return `${formatDate(start)} — ${formatDate(end)}`;
}

export function varianceCopy(t, actual, planned) {
    const delta = minutesDelta(actual, planned);
    if (delta === 0) {
        return { text: formatHours(t, 0), hint: t('time.onNorm'), tone: 'success' };
    }
    const abs = formatHours(t, Math.abs(delta));
    if (delta > 0) {
        return { text: `+${abs}`, hint: t('time.overNorm'), tone: 'accent' };
    }
    return { text: `−${abs}`, hint: t('time.underNorm'), tone: 'danger' };
}

export function JournalLink({ from, to, employeeId, children }) {
    const params = new URLSearchParams();
    if (from) {
        params.set('dateFrom', from);
    }
    if (to) {
        params.set('dateTo', to);
    }
    if (employeeId) {
        params.set('employeeId', employeeId);
    }
    return <Link to={`/app/time/entries?${params.toString()}`}>{children}</Link>;
}
