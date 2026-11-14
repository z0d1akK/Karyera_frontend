import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { StartAssessment } from '../../features/analytics/StartAssessment.jsx';
import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { useAuthStore } from '../../store/authStore.js';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

function monday() {
    const now = new Date();
    const day = now.getDay() || 7;
    const date = new Date(now);
    date.setDate(now.getDate() - day + 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

export function MyStatsPage() {
    const { t } = useTranslation();
    const employee = useAuthStore((state) => state.employee);
    const assessments = useQuery({
        queryKey: ['analytics', 'mine', employee?.id],
        enabled: Boolean(employee?.id),
        queryFn: () => analyticsApi.assessments(employee.id),
    });
    const dynamics = useQuery({
        queryKey: ['analytics', 'dynamics', employee?.id],
        enabled: Boolean(employee?.id),
        queryFn: () => analyticsApi.dynamics(employee.id),
    });
    const week = useQuery({
        queryKey: ['time', 'week', employee?.id],
        enabled: Boolean(employee?.id),
        queryFn: () => timeApi.weeklySummary(employee.id, monday()),
    });

    if (!employee) {
        return <Skeleton rows={4} />;
    }

    const latest = (assessments.data || [])[0];
    const logged = Number(week.data?.approvedMinutes || 0) + Number(week.data?.pendingMinutes || 0) + Number(week.data?.draftMinutes || 0);

    return (
        <section className={page.sections}>
            <PageHeader title={t('analyticsUi.me')} />
            <AnalyticsNav />
            {week.isError || assessments.isError ? <PageState title={t('errors.loadFailed')} /> : null}
            <StatRow>
                <StatTile label={t('analyticsUi.weekHours')} value={hoursLabel(logged)} />
                <StatTile label={t('analyticsUi.score')} value={latest?.totalScore ?? '—'} tone="accent" />
                <StatTile label={t('time.norm')} value={hoursLabel(week.data?.plannedMinutes)} />
            </StatRow>
            <Card>
            <h2 className={page.sectionTitle}>{t('analyticsUi.development')}</h2>
            {(dynamics.data?.points || []).length ? (
                <ul>
                    {dynamics.data.points.map((point) => (
                        <li key={point.assessmentId}>
                            <Link to={`/app/career/assessments/${point.assessmentId}`}>{formatDate(point.calculatedAt)} — {point.totalScore}</Link>
                        </li>
                    ))}
                </ul>
            ) : <p>{t('common.noData')}</p>}
            </Card>
            <StartAssessment
                employeeId={employee.id}
                positionId={employee.position?.id || employee.positionId || ''}
                gradeId={employee.grade?.id || employee.gradeId || ''}
            />
        </section>
    );
}
