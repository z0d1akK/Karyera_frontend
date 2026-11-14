import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { AnalyticsKpis } from '../../features/analytics/AnalyticsKpis.jsx';
import { ChartCard } from '../../features/analytics/charts/ChartCard.jsx';
import { DeficitsBarChart } from '../../features/analytics/charts/DeficitsBarChart.jsx';
import { mapDeficits } from '../../features/analytics/charts/chartMappers.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { catalogName } from '../../shared/lib/format.js';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

export function AnalyticsOverviewPage() {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const overview = useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.overview() });
    const skills = useQuery({ queryKey: ['analytics', 'skills'], queryFn: () => analyticsApi.skills() });
    const chartSkills = useQuery({ queryKey: ['analytics', 'skill-deficits'], queryFn: () => analyticsApi.skillDeficits() });

    if (overview.isLoading) {
        return (
            <section className={page.sections}>
                <PageHeader title={t('analyticsUi.overview')} />
                <AnalyticsNav />
                <Skeleton rows={4} />
            </section>
        );
    }
    if (overview.isError) {
        return (
            <section className={page.sections}>
                <PageHeader title={t('analyticsUi.overview')} />
                <AnalyticsNav />
                <PageState title={t('errors.loadFailed')} onAction={overview.refetch} actionLabel={t('common.retry')} />
            </section>
        );
    }

    const chartRows = mapDeficits(chartSkills.data?.deficits, catalogs);

    return (
        <section className={page.sections}>
            <PageHeader title={t('analyticsUi.overview')} />
            <AnalyticsNav />
            <AnalyticsKpis overview={overview.data} />
            {Number(overview.data?.assessedEmployees || 0) === 0 ? (
                <PageState title={t('analyticsUi.emptyDashboard')} description={t('analyticsUi.emptyDashboardHint')} />
            ) : null}
            <ChartCard title={t('analyticsUi.deficits')} to="/app/analytics/dashboard" empty={!chartRows.length} compact>
                <DeficitsBarChart data={chartRows} />
            </ChartCard>
            <Card>
                <div className={page.sectionHead}>
                    <h2 className={page.sectionTitle}>{t('analyticsUi.deficits')}</h2>
                    <Link className={page.sectionMore} to="/app/analytics/employees">{t('common.more')}</Link>
                </div>
                {skills.isError ? <PageState title={t('errors.loadFailed')} onAction={skills.refetch} actionLabel={t('common.retry')} /> : null}
                <DataTable
                    rows={(skills.data?.deficits || []).map((item) => ({ ...item, id: item.skillId }))}
                    columns={[
                        { key: 'skill', header: t('analyticsUi.skill'), render: (row) => row.skillName || catalogName(catalogs.skills?.find((skill) => skill.id === row.skillId)) },
                        { key: 'count', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                    ]}
                />
            </Card>
        </section>
    );
}
