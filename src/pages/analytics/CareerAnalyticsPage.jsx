import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';

export function CareerAnalyticsPage() {
    const { t } = useTranslation();
    const readiness = useQuery({ queryKey: ['analytics', 'readiness'], queryFn: () => analyticsApi.readiness() });
    const development = useQuery({ queryKey: ['analytics', 'development'], queryFn: () => analyticsApi.development() });
    const activity = useQuery({ queryKey: ['analytics', 'activity'], queryFn: () => analyticsApi.activity() });

    if (readiness.isLoading) {
        return <Skeleton rows={4} />;
    }
    if (readiness.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={readiness.refetch} actionLabel={t('common.retry')} />;
    }

    return (
        <section>
            <PageHeader title={t('analyticsUi.career')} />
            <AnalyticsNav />
            <h2>{t('analyticsUi.readiness')}</h2>
            <DataTable
                rows={(readiness.data?.buckets || []).map((item, index) => ({ ...item, id: `${item.label}-${index}` }))}
                columns={[
                    { key: 'label', header: t('analyticsUi.score'), render: (row) => row.label },
                    { key: 'employees', header: t('analyticsUi.employeesCount'), render: (row) => row.employees },
                ]}
            />
            <h2>{t('analyticsUi.development')}</h2>
            <DataTable
                rows={(development.data?.points || []).map((item) => ({ ...item, id: item.period }))}
                columns={[
                    { key: 'period', header: t('time.period'), render: (row) => formatDate(row.period) },
                    { key: 'count', header: t('analyticsUi.assessed'), render: (row) => row.assessments },
                    { key: 'average', header: t('analyticsUi.average'), render: (row) => row.averageScore ?? '—' },
                ]}
            />
            <h2>{t('analyticsUi.activity')}</h2>
            <DataTable
                rows={(activity.data?.points || []).map((item) => ({ ...item, id: item.periodStart }))}
                columns={[
                    { key: 'period', header: t('time.period'), render: (row) => formatDate(row.periodStart) },
                    { key: 'minutes', header: t('time.logged'), render: (row) => row.approvedMinutes },
                    { key: 'tasks', header: t('time.task'), render: (row) => row.completedTasks },
                ]}
            />
        </section>
    );
}
