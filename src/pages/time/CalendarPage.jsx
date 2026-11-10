import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import styles from './CalendarPage.module.css';

function monthRange(cursor) {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const iso = (date) => date.toISOString().slice(0, 10);
    return { from: iso(start), to: iso(end) };
}

export function CalendarPage() {
    const { t } = useTranslation();
    const employee = useAuthStore((state) => state.employee);
    const [cursor, setCursor] = useState(() => new Date());
    const range = useMemo(() => monthRange(cursor), [cursor]);
    const calendar = useQuery({
        queryKey: ['time', 'calendar', employee?.id, range.from],
        enabled: Boolean(employee?.id),
        queryFn: () => timeApi.workCalendar(employee.id, range.from, range.to),
    });
    const summary = useQuery({
        queryKey: ['time', 'daily', employee?.id, range.from],
        enabled: Boolean(employee?.id),
        queryFn: () => timeApi.dailySummary(employee.id, range.from, range.to),
    });
    const logged = new Map((summary.data?.days || []).map((day) => [day.date, day.totalMinutes]));

    return (
        <section>
            <PageHeader
                title={t('time.calendar')}
                description={`${range.from} — ${range.to}`}
                actions={(
                    <>
                        <Button variant="secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>{t('common.back')}</Button>
                        <Button variant="secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>{t('common.next')}</Button>
                    </>
                )}
            />
            <TimeNav />
            {calendar.isLoading ? <Skeleton rows={4} /> : null}
            {calendar.isError ? <PageState title={t('errors.loadFailed')} onAction={calendar.refetch} actionLabel={t('common.retry')} /> : null}
            <div className={styles.month}>
                {(calendar.data?.days || []).map((day) => (
                    <Link key={day.date} className={styles.day} to={`/app/time/entries?date=${day.date}`}>
                        <div className={styles.date}>{day.date.slice(8)}</div>
                        <div className={styles.meta}>{t('time.planned')}: {hoursLabel(day.plannedMinutes)}</div>
                        <div className={styles.meta}>{t('time.logged')}: {hoursLabel(logged.get(day.date))}</div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
