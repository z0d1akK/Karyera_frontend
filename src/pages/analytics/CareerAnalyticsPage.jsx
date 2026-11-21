import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { ChartCard } from '../../features/analytics/charts/ChartCard.jsx';
import { ChartToolbar } from '../../features/analytics/charts/ChartToolbar.jsx';
import { ActivityComboChart } from '../../features/analytics/charts/ActivityComboChart.jsx';
import { ReadinessDonut } from '../../features/analytics/charts/ReadinessDonut.jsx';
import { ScoreLineChart } from '../../features/analytics/charts/ScoreLineChart.jsx';
import {
    ACTIVITY_GRAINS,
    SCORE_GRAINS,
    mapActivity,
    mapReadiness,
    mapScorePoints,
    readinessName,
    takeLast,
} from '../../features/analytics/charts/chartMappers.js';
import { hoursLabel } from '../../features/time/api/timeApi.js';
import { formatGrainDate, formatScorePercent } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';

export function CareerAnalyticsPage() {
    const { t } = useTranslation();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [scoreGrain, setScoreGrain] = useState('MONTH');
    const [scoreLast, setScoreLast] = useState(12);
    const [activityGrain, setActivityGrain] = useState('MONTH');
    const [activityLast, setActivityLast] = useState(12);
    const readiness = useQuery({ queryKey: ['analytics', 'readiness'], queryFn: () => analyticsApi.readiness() });
    const development = useQuery({
        queryKey: ['analytics', 'development', scoreGrain, from, to],
        queryFn: () => analyticsApi.development(scoreGrain, from || undefined, to || undefined),
    });
    const activity = useQuery({
        queryKey: ['analytics', 'activity', activityGrain, from, to],
        queryFn: () => analyticsApi.activity(activityGrain, from || undefined, to || undefined),
    });

    const readinessRows = mapReadiness(readiness.data?.buckets, t);
    const developmentAll = useMemo(
        () => mapScorePoints(development.data?.points || [], 'period', scoreGrain),
        [development.data, scoreGrain],
    );
    const developmentRows = takeLast(developmentAll, scoreLast);
    const activityAll = useMemo(
        () => mapActivity(activity.data?.points || [], activityGrain),
        [activity.data, activityGrain],
    );
    const activityRows = takeLast(activityAll, activityLast);

    const shown = (visible, total) => (total > visible.length
        ? t('analyticsUi.shownOf', { shown: visible.length, total })
        : null);

    if (readiness.isLoading) {
        return (
            <AnalyticsPage title={t('analyticsUi.career')} description={t('analyticsUi.careerHint')}>
                <Skeleton rows={4} />
            </AnalyticsPage>
        );
    }
    if (readiness.isError) {
        return (
            <AnalyticsPage title={t('analyticsUi.career')} description={t('analyticsUi.careerHint')}>
                <PageState title={t('errors.loadFailed')} onAction={readiness.refetch} actionLabel={t('common.retry')} />
            </AnalyticsPage>
        );
    }

    return (
        <AnalyticsPage title={t('analyticsUi.career')} description={t('analyticsUi.careerHint')}>
            <ChartCard
                title={t('analyticsUi.readiness')}
                donut
                empty={!readinessRows.length}
                details={(
                    <DataTable
                        rows={(readiness.data?.buckets || []).map((item, index) => ({ ...item, id: `${item.label}-${index}` }))}
                        columns={[
                            { key: 'label', header: t('analyticsUi.score'), render: (row) => readinessName(t, row.label) },
                            { key: 'employees', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                        ]}
                    />
                )}
            >
                <ReadinessDonut data={readinessRows} />
            </ChartCard>
            <ChartCard
                title={t('analyticsUi.development')}
                empty={!development.isFetching && !developmentRows.length}
                toolbar={(
                    <ChartToolbar
                        grains={SCORE_GRAINS}
                        grain={scoreGrain}
                        onGrain={setScoreGrain}
                        last={scoreLast}
                        onLast={setScoreLast}
                        from={from}
                        to={to}
                        onFrom={setFrom}
                        onTo={setTo}
                    />
                )}
                caption={shown(developmentRows, developmentAll.length)}
                details={(
                    <DataTable
                        rows={developmentRows.map((item) => ({ ...item, id: item.period }))}
                        columns={[
                            { key: 'period', header: t('time.period'), render: (row) => formatGrainDate(row.period, scoreGrain) },
                            { key: 'count', header: t('analyticsUi.assessed'), render: (row) => row.assessments },
                            { key: 'average', header: t('analyticsUi.average'), render: (row) => formatScorePercent(row.averageScore) },
                        ]}
                    />
                )}
            >
                <ScoreLineChart data={developmentRows} />
            </ChartCard>
            <ChartCard
                title={t('analyticsUi.activity')}
                empty={!activity.isFetching && !activityRows.length}
                toolbar={(
                    <ChartToolbar
                        grains={ACTIVITY_GRAINS}
                        grain={activityGrain}
                        onGrain={setActivityGrain}
                        last={activityLast}
                        onLast={setActivityLast}
                        from={from}
                        to={to}
                        onFrom={setFrom}
                        onTo={setTo}
                    />
                )}
                caption={shown(activityRows, activityAll.length)}
                details={(
                    <DataTable
                        rows={activityRows.map((item) => ({ ...item, id: item.periodStart }))}
                        columns={[
                            { key: 'period', header: t('time.period'), render: (row) => formatGrainDate(row.periodStart, activityGrain) },
                            { key: 'minutes', header: t('time.logged'), render: (row) => hoursLabel(row.approvedMinutes) },
                            { key: 'tasks', header: t('time.task'), render: (row) => row.completedTasks },
                        ]}
                    />
                )}
            >
                <ActivityComboChart data={activityRows} />
            </ChartCard>
        </AnalyticsPage>
    );
}
