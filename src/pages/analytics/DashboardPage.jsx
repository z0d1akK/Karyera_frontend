import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { AnalyticsKpis } from '../../features/analytics/AnalyticsKpis.jsx';
import { ChartCard } from '../../features/analytics/charts/ChartCard.jsx';
import { ChartToolbar } from '../../features/analytics/charts/ChartToolbar.jsx';
import { ActivityComboChart } from '../../features/analytics/charts/ActivityComboChart.jsx';
import { DeficitsBarChart } from '../../features/analytics/charts/DeficitsBarChart.jsx';
import { DepartmentBarChart } from '../../features/analytics/charts/DepartmentBarChart.jsx';
import { ReadinessDonut } from '../../features/analytics/charts/ReadinessDonut.jsx';
import { ScoreLineChart } from '../../features/analytics/charts/ScoreLineChart.jsx';
import {
    ACTIVITY_GRAINS,
    SCORE_GRAINS,
    mapActivity,
    mapDeficits,
    mapDepartments,
    mapReadiness,
    mapScorePoints,
    readinessName,
    takeLast,
    takeTop,
} from '../../features/analytics/charts/chartMappers.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { hoursLabel } from '../../features/time/api/timeApi.js';
import { formatGrainDate, formatScorePercent } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import page from '../../shared/styles/page.module.css';

export function AnalyticsDashboardPage() {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const [deficitTop, setDeficitTop] = useState(10);
    const [departmentTop, setDepartmentTop] = useState(10);
    const [scoreGrain, setScoreGrain] = useState('MONTH');
    const [scoreLast, setScoreLast] = useState(12);
    const [activityGrain, setActivityGrain] = useState('MONTH');
    const [activityLast, setActivityLast] = useState(12);
    const [scoreFrom, setScoreFrom] = useState('');
    const [scoreTo, setScoreTo] = useState('');
    const [activityFrom, setActivityFrom] = useState('');
    const [activityTo, setActivityTo] = useState('');

    const overview = useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.overview() });
    const deficits = useQuery({ queryKey: ['analytics', 'skill-deficits'], queryFn: () => analyticsApi.skillDeficits() });
    const readiness = useQuery({ queryKey: ['analytics', 'readiness'], queryFn: () => analyticsApi.readiness() });
    const departments = useQuery({ queryKey: ['analytics', 'departments'], queryFn: () => analyticsApi.departments() });
    const development = useQuery({
        queryKey: ['analytics', 'development', scoreGrain, scoreFrom, scoreTo],
        queryFn: () => analyticsApi.development(scoreGrain, scoreFrom || undefined, scoreTo || undefined),
    });
    const activity = useQuery({
        queryKey: ['analytics', 'activity', activityGrain, activityFrom, activityTo],
        queryFn: () => analyticsApi.activity(activityGrain, activityFrom || undefined, activityTo || undefined),
    });

    const deficitAll = mapDeficits(deficits.data?.deficits, catalogs);
    const deficitRows = takeTop(deficitAll, deficitTop);
    const readinessRows = mapReadiness(readiness.data?.buckets, t);
    const departmentAll = mapDepartments(departments.data?.departments, catalogs, t('analyticsUi.noDepartment'));
    const departmentRows = takeTop(departmentAll, departmentTop, 'employees');
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

    if (overview.isLoading) {
        return (
            <AnalyticsPage title={t('analyticsUi.dashboard')} description={t('analyticsUi.dashboardHint')}>
                <Skeleton rows={5} />
            </AnalyticsPage>
        );
    }
    if (overview.isError) {
        return (
            <AnalyticsPage title={t('analyticsUi.dashboard')} description={t('analyticsUi.dashboardHint')}>
                <PageState title={t('errors.loadFailed')} onAction={overview.refetch} actionLabel={t('common.retry')} />
            </AnalyticsPage>
        );
    }

    const shown = (visible, total) => (total > visible.length
        ? t('analyticsUi.shownOf', { shown: visible.length, total })
        : null);

    return (
        <AnalyticsPage title={t('analyticsUi.dashboard')} description={t('analyticsUi.dashboardHint')}>
            <AnalyticsKpis overview={overview.data} />
            {Number(overview.data?.assessedEmployees || 0) === 0 ? (
                <PageState title={t('analyticsUi.emptyDashboard')} description={t('analyticsUi.emptyDashboardHint')} />
            ) : (
                <div className={`${page.grid} ${page.equal}`}>
                    <ChartCard
                        title={t('analyticsUi.deficits')}
                        empty={!deficitRows.length}
                        toolbar={<ChartToolbar top={deficitTop} onTop={setDeficitTop} />}
                        caption={shown(deficitRows, deficitAll.length)}
                        details={(
                            <DataTable
                                rows={deficitRows.map((item) => ({ ...item, id: item.skillId }))}
                                columns={[
                                    { key: 'skill', header: t('analyticsUi.skill'), render: (row) => row.name },
                                    { key: 'count', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                                ]}
                            />
                        )}
                    >
                        <DeficitsBarChart data={deficitRows} />
                    </ChartCard>
                    <ChartCard
                        title={t('analyticsUi.readiness')}
                        donut
                        empty={!readinessRows.length}
                        details={(
                            <DataTable
                                rows={readinessRows.map((item, index) => ({ ...item, id: `${item.label}-${index}` }))}
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
                        className={page.spanAll}
                        title={t('analyticsUi.departments')}
                        empty={!departmentRows.length}
                        toolbar={<ChartToolbar top={departmentTop} onTop={setDepartmentTop} />}
                        caption={shown(departmentRows, departmentAll.length)}
                        details={(
                            <DataTable
                                rows={departmentRows.map((item, index) => ({ ...item, id: item.departmentId || `none-${index}` }))}
                                columns={[
                                    { key: 'name', header: t('employees.department'), render: (row) => row.name },
                                    { key: 'employees', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                                    { key: 'score', header: t('analyticsUi.average'), render: (row) => `${row.score}%` },
                                ]}
                            />
                        )}
                    >
                        <DepartmentBarChart data={departmentRows} />
                    </ChartCard>
                    <ChartCard
                        className={page.spanAll}
                        title={t('analyticsUi.development')}
                        empty={!development.isFetching && !developmentRows.length}
                        emptyTitle={t('analyticsUi.emptyPeriod')}
                        toolbar={(
                            <ChartToolbar
                                grains={SCORE_GRAINS}
                                grain={scoreGrain}
                                onGrain={setScoreGrain}
                                last={scoreLast}
                                onLast={setScoreLast}
                                from={scoreFrom}
                                to={scoreTo}
                                onFrom={setScoreFrom}
                                onTo={setScoreTo}
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
                        className={page.spanAll}
                        title={t('analyticsUi.activity')}
                        empty={!activity.isFetching && !activityRows.length}
                        emptyTitle={t('analyticsUi.emptyPeriod')}
                        toolbar={(
                            <ChartToolbar
                                grains={ACTIVITY_GRAINS}
                                grain={activityGrain}
                                onGrain={setActivityGrain}
                                last={activityLast}
                                onLast={setActivityLast}
                                from={activityFrom}
                                to={activityTo}
                                onFrom={setActivityFrom}
                                onTo={setActivityTo}
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
                </div>
            )}
        </AnalyticsPage>
    );
}
