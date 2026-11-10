import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { catalogName } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';

export function AnalyticsOverviewPage() {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const overview = useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.overview() });
    const skills = useQuery({ queryKey: ['analytics', 'skills'], queryFn: () => analyticsApi.skills() });

    if (overview.isLoading) {
        return <Skeleton rows={4} />;
    }
    if (overview.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={overview.refetch} actionLabel={t('common.retry')} />;
    }

    return (
        <section>
            <PageHeader title={t('analyticsUi.overview')} />
            <AnalyticsNav />
            <StatRow>
                <StatTile label={t('analyticsUi.assessed')} value={overview.data.assessedEmployees} />
                <StatTile label={t('analyticsUi.average')} value={overview.data.averageScore ?? '—'} tone="accent" />
                <StatTile label={t('analyticsUi.completeData')} value={overview.data.employeesWithCompleteData} />
                <StatTile label={t('analyticsUi.fresh')} value={overview.data.freshAssessments} tone="success" />
            </StatRow>
            <h2>{t('analyticsUi.deficits')}</h2>
            <DataTable
                rows={(skills.data?.deficits || []).map((item) => ({ ...item, id: item.skillId }))}
                    columns={[
                    { key: 'skill', header: t('analyticsUi.skill'), render: (row) => catalogName(catalogs.skills?.find((skill) => skill.id === row.skillId)) || row.skillId },
                    { key: 'count', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                ]}
            />
            <p><Link to="/app/analytics/employees">{t('common.more')}</Link></p>
        </section>
    );
}
