import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, fullName } from '../../shared/lib/format.js';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import page from '../../shared/styles/page.module.css';

export function EmployeesAnalyticsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const catalogs = useCatalogs();
    const [filters, setFilters] = useState({ lastName: '', departmentId: '', positionId: '', page: 0, size: 50, sortBy: 'lastName' });
    const employees = useQuery({
        queryKey: ['analytics', 'employee-list', filters],
        queryFn: async () => unwrapPage(await employeeApi.list({
            lastName: filters.lastName || undefined,
            departmentId: filters.departmentId || undefined,
            positionId: filters.positionId || undefined,
            page: 0,
            size: filters.size,
            sortBy: 'lastName',
        })),
    });

    return (
        <AnalyticsPage title={t('analyticsUi.employees')} description={t('analyticsUi.employeesHint')}>
            <Card>
                <div className={page.filterBar}>
                    <Input label={t('employees.lastName')} value={filters.lastName} onChange={(event) => setFilters({ ...filters, lastName: event.target.value })} />
                    <Select label={t('employees.department')} value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
                        <option value="">{t('common.all')}</option>
                        {catalogs.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Select label={t('employees.position')} value={filters.positionId} onChange={(event) => setFilters({ ...filters, positionId: event.target.value })}>
                        <option value="">{t('common.all')}</option>
                        {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                </div>
            </Card>
            <Card>
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
            </Card>
        </AnalyticsPage>
    );
}
