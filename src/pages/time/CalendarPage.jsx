import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { formatHours, timeApi } from '../../features/time/api/timeApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { localTodayIso } from '../../shared/lib/format.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import styles from './CalendarPage.module.css';
import timeStyles from './TimePages.module.css';
import page from '../../shared/styles/page.module.css';

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
    const role = useAuthStore((state) => state.session?.role);
    const canReview = canApproveTimesheets(role);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(employee?.id || '');
    const employeeId = canReview ? (selectedEmployeeId || employee?.id) : employee?.id;
    const [cursor, setCursor] = useState(() => new Date());
    const range = useMemo(() => monthRange(cursor), [cursor]);
    const calendar = useQuery({
        queryKey: ['time', 'calendar', employeeId, range.from],
        enabled: Boolean(employeeId),
        queryFn: () => timeApi.workCalendar(employeeId, range.from, range.to),
    });
    const summary = useQuery({
        queryKey: ['time', 'daily', employeeId, range.from],
        enabled: Boolean(employeeId),
        queryFn: () => timeApi.dailySummary(employeeId, range.from, range.to),
    });
    const logged = new Map((summary.data?.days || []).map((day) => [day.date, day.totalMinutes]));
    const byDate = new Map((calendar.data?.days || []).map((day) => [day.date, day]));
    const today = localTodayIso();
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
    useEffect(() => {
        if (!selectedEmployeeId && employee?.id) {
            setSelectedEmployeeId(employee.id);
        }
    }, [employee?.id, selectedEmployeeId]);

    const extraOptions = employee?.id ? [{ id: employee.id, label: t('time.myJournal') }] : [];

    return (
        <section className={page.sections}>
            <div className={page.pageHead}>
                <PageHeader title={t('time.calendar')} description={t('time.calendarSubtitle')} />
                <TimeNav />
            </div>
            <div className={timeStyles.toolbar}>
                <h2 className={styles.monthTitle}>{title}</h2>
                <div className={timeStyles.toolbarEnd}>
                    {canReview ? (
                        <div className={timeStyles.picker}>
                            <EmployeePicker
                                searchable
                                label={t('time.employee')}
                                value={selectedEmployeeId}
                                extraOptions={extraOptions}
                                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                            />
                        </div>
                    ) : null}
                    <div className={timeStyles.monthNav}>
                        <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                            {t('time.previousMonth')}
                        </Button>
                        <Button onClick={() => setCursor(new Date())}>{t('time.today')}</Button>
                        <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                            {t('time.nextMonth')}
                        </Button>
                    </div>
                </div>
            </div>
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
                        const loggedMinutes = logged.get(day.date);
                        return (
                            <Link
                                key={day.date}
                                className={`${styles.day} ${day.date === today ? styles.today : ''} ${weekend ? styles.weekend : ''}`}
                                to={`/app/time/entries?date=${day.date}${employeeId ? `&employeeId=${employeeId}` : ''}`}
                            >
                                <div className={styles.date}>{day.date.slice(8)}</div>
                                <div className={styles.meta}>{t('time.planned')}: {formatHours(t, day.plannedMinutes)}</div>
                                <div className={styles.meta}>
                                    {t('time.logged')}: {loggedMinutes ? formatHours(t, loggedMinutes) : t('common.notSpecified')}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </Card>
        </section>
    );
}
