import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { AnalyticsKpis } from '../../features/analytics/AnalyticsKpis.jsx';
import { ChartCard } from '../../features/analytics/charts/ChartCard.jsx';
import { DeficitsBarChart } from '../../features/analytics/charts/DeficitsBarChart.jsx';
import { mapDeficits, takeTop } from '../../features/analytics/charts/chartMappers.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import page from '../../shared/styles/page.module.css';

const OVERVIEW_DEFICIT_LIMIT = 8;

export function AnalyticsOverviewPage() {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const overview = useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.overview() });
    const chartSkills = useQuery({ queryKey: ['analytics', 'skill-deficits'], queryFn: () => analyticsApi.skillDeficits() });

    if (overview.isLoading) {
        return (
            <AnalyticsPage title={t('analyticsUi.overview')} description={t('analyticsUi.overviewHint')}>
                <Skeleton rows={4} />
            </AnalyticsPage>
        );
    }
    if (overview.isError) {
        return (
            <AnalyticsPage title={t('analyticsUi.overview')} description={t('analyticsUi.overviewHint')}>
                <PageState title={t('errors.loadFailed')} onAction={overview.refetch} actionLabel={t('common.retry')} />
            </AnalyticsPage>
        );
    }

    const chartRows = takeTop(mapDeficits(chartSkills.data?.deficits, catalogs), OVERVIEW_DEFICIT_LIMIT);
    const chartHeight = Math.max(168, chartRows.length * 48 + 36);

    return (
        <AnalyticsPage title={t('analyticsUi.overview')} description={t('analyticsUi.overviewHint')}>
            <AnalyticsKpis overview={overview.data} />
            {Number(overview.data?.assessedEmployees || 0) === 0 ? (
                <PageState title={t('analyticsUi.emptyDashboard')} description={t('analyticsUi.emptyDashboardHint')} />
            ) : null}
            {chartSkills.isError ? (
                <PageState title={t('errors.loadFailed')} onAction={chartSkills.refetch} actionLabel={t('common.retry')} />
            ) : (
                <ChartCard
                    title={t('analyticsUi.deficits')}
                    to="/app/analytics/dashboard"
                    empty={!chartSkills.isLoading && !chartRows.length}
                    height={chartHeight}
                >
                    <DeficitsBarChart data={chartRows} />
                </ChartCard>
            )}
            <Card>
                <div className={page.sectionHead}>
                    <h2 className={page.sectionTitle}>{t('analyticsUi.deficits')}</h2>
                    <Link className={page.sectionMore} to="/app/analytics/dashboard">{t('common.more')}</Link>
                </div>
                <DataTable
                    rows={chartRows}
                    columns={[
                        { key: 'skill', header: t('analyticsUi.skill'), render: (row) => row.name },
                        { key: 'count', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                    ]}
                />
            </Card>
        </AnalyticsPage>
    );
}
