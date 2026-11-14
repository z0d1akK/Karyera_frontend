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
import { Card } from '../../shared/ui/Card/Card.jsx';
import styles from './CalendarPage.module.css';

function monthRange(cursor) {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const iso = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${dayOfMonth}`;
    };
    return { from: iso(start), to: iso(end), start, end };
}

export function CalendarPage() {
    const { t, i18n } = useTranslation();
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
    const byDate = new Map((calendar.data?.days || []).map((day) => [day.date, day]));
    const today = new Date().toISOString().slice(0, 10);
    const weekdayLabels = t('time.weekdays', { returnObjects: true });
    const title = cursor.toLocaleDateString(i18n.resolvedLanguage || 'ru', { month: 'long', year: 'numeric' });
    const offset = (range.start.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < offset; i += 1) {
        cells.push(null);
    }
    for (let day = 1; day <= range.end.getDate(); day += 1) {
        const date = `${range.from.slice(0, 8)}${String(day).padStart(2, '0')}`;
        cells.push(byDate.get(date) || { date, plannedMinutes: 0 });
    }

    return (
        <section>
            <PageHeader title={t('time.calendar')} />
            <TimeNav />
            <h2 className={styles.monthTitle}>{title}</h2>
            <Card>
            {calendar.isLoading ? <Skeleton rows={4} /> : null}
            {calendar.isError ? <PageState title={t('errors.loadFailed')} onAction={calendar.refetch} actionLabel={t('common.retry')} /> : null}
            <div className={styles.weekdays}>
                {(Array.isArray(weekdayLabels) ? weekdayLabels : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']).map((label) => (
                    <div key={label} className={styles.weekday}>{label}</div>
                ))}
            </div>
            <div className={styles.month}>
                {cells.map((day, index) => {
                    if (!day) {
                        return <div key={`empty-${index}`} className={styles.empty} />;
                    }
                    const weekend = new Date(`${day.date}T00:00:00`).getDay() % 6 === 0;
                    return (
                        <Link
                            key={day.date}
                            className={`${styles.day} ${day.date === today ? styles.today : ''} ${weekend ? styles.weekend : ''}`}
                            to={`/app/time/entries?date=${day.date}`}
                        >
                            <div className={styles.date}>{day.date.slice(8)}</div>
                            <div className={styles.meta}>{t('time.planned')}: {hoursLabel(day.plannedMinutes)}</div>
                            <div className={styles.meta}>{t('time.logged')}: {hoursLabel(logged.get(day.date))}</div>
                        </Link>
                    );
                })}
            </div>
            </Card>
            <div className={styles.nav}>
                <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>{t('common.back')}</Button>
                <Button onClick={() => setCursor(new Date())}>{t('time.today')}</Button>
                <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>{t('common.next')}</Button>
            </div>
        </section>
    );
}
