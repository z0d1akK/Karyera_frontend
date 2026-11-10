import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, fullName } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';

export function EmployeesAnalyticsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employees = useQuery({
        queryKey: ['analytics', 'employee-list'],
        queryFn: async () => unwrapPage(await employeeApi.list({ page: 0, size: 50, sortBy: 'lastName' })),
    });

    return (
        <section>
            <PageHeader title={t('analyticsUi.employees')} />
            <AnalyticsNav />
            {employees.isLoading ? <Skeleton rows={5} /> : null}
            {employees.isError ? <PageState title={t('errors.loadFailed')} onAction={employees.refetch} actionLabel={t('common.retry')} /> : null}
            {employees.data ? (
                <DataTable
                    rows={employees.data.content || []}
                    onRowClick={(row) => navigate(`/app/analytics/employees/${row.id}`)}
                    columns={[
                        { key: 'name', header: t('employees.fullName'), render: (row) => fullName(row) },
                        { key: 'position', header: t('employees.position'), render: (row) => catalogName(row.position) },
                        { key: 'grade', header: t('employees.grade'), render: (row) => catalogName(row.grade) },
                    ]}
                />
            ) : null}
        </section>
    );
}
