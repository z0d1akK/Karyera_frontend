import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, fullName } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { canCreateAccounts } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';

export function EmployeesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = useAuthStore((state) => state.session?.role);
    const catalogs = useCatalogs();
    const [filters, setFilters] = useState({
        page: 0,
        size: 20,
        sortBy: 'lastName',
        sortDirection: 'ASC',
    });

    const query = useQuery({
        queryKey: queryKeys.employees.all(filters),
        queryFn: async () => unwrapPage(await employeeApi.list(filters)),
    });

    const pageData = query.data;

    return (
        <section>
            <PageHeader
                title={t('employees.title')}
                actions={canCreateAccounts(role) ? <Button onClick={() => navigate('/app/admin/users/new')}>{t('common.create')}</Button> : null}
            />
            <StatRow>
                <StatTile label={t('employees.title')} value={pageData?.totalElements ?? 0} />
            </StatRow>
            <Card>
                <ListFilters>
                    <Input
                        label={t('employees.firstName')}
                        value={filters.firstName || ''}
                        onChange={(e) => setFilters({ ...filters, firstName: e.target.value, page: 0 })}
                    />
                    <Input
                        label={t('employees.lastName')}
                        value={filters.lastName || ''}
                        onChange={(e) => setFilters({ ...filters, lastName: e.target.value, page: 0 })}
                    />
                    <Select
                        label={t('employees.department')}
                        value={filters.departmentId || ''}
                        onChange={(e) => setFilters({ ...filters, departmentId: e.target.value, page: 0 })}
                    >
                        <option value="">{t('common.all')}</option>
                        {catalogs.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Select
                        label={t('employees.position')}
                        value={filters.positionId || ''}
                        onChange={(e) => setFilters({ ...filters, positionId: e.target.value, page: 0 })}
                    >
                        <option value="">{t('common.all')}</option>
                        {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Select
                        label={t('employees.grade')}
                        value={filters.gradeId || ''}
                        onChange={(e) => setFilters({ ...filters, gradeId: e.target.value, page: 0 })}
                    >
                        <option value="">{t('common.all')}</option>
                        {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Select
                        label={t('employees.status')}
                        value={filters.employmentStatus || ''}
                        onChange={(e) => setFilters({ ...filters, employmentStatus: e.target.value, page: 0 })}
                    >
                        <option value="">{t('common.all')}</option>
                        {['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map((status) => (
                            <option key={status} value={status}>{enumLabel(t, 'employmentStatus', status)}</option>
                        ))}
                    </Select>
                    <Input
                        type="date"
                        label={t('form.hireDateFrom')}
                        value={filters.hireDateFrom || ''}
                        onChange={(e) => setFilters({ ...filters, hireDateFrom: e.target.value, page: 0 })}
                    />
                    <Input
                        type="date"
                        label={t('form.hireDateTo')}
                        value={filters.hireDateTo || ''}
                        onChange={(e) => setFilters({ ...filters, hireDateTo: e.target.value, page: 0 })}
                    />
                    <SortField
                        value={filters.sortBy}
                        direction={filters.sortDirection}
                        options={[{ value: 'lastName', label: t('employees.fullName') }, { value: 'hireDate', label: t('form.hireDate') }]}
                        onChange={(sortBy, sortDirection) => setFilters({ ...filters, sortBy, sortDirection, page: 0 })}
                    />
                    <PageSizeField value={filters.size} onChange={(size) => setFilters({ ...filters, size, page: 0 })} />
                </ListFilters>
                {query.isLoading ? <Skeleton /> : (
                    <>
                        <DataTable
                            rows={pageData?.content || []}
                            onRowClick={(row) => navigate(`/app/employees/${row.id}`)}
                            columns={[
                                { key: 'name', sortKey: 'lastName', header: t('employees.fullName'), render: (row) => fullName(row) },
                                { key: 'position', header: t('employees.position'), render: (row) => catalogName(row.position) },
                                { key: 'grade', header: t('employees.grade'), render: (row) => catalogName(row.grade) },
                                { key: 'specialization', header: t('employees.specialization'), render: (row) => catalogName(row.specialization) },
                                {
                                    key: 'status',
                                    header: t('employees.status'),
                                    render: (row) => (
                                        <Badge tone={statusTone('employmentStatus', row.employmentStatus)}>
                                            {enumLabel(t, 'employmentStatus', row.employmentStatus)}
                                        </Badge>
                                    ),
                                },
                            ]}
                        />
                        <Pagination
                            page={pageData?.number || 0}
                            totalPages={pageData?.totalPages || 0}
                            onChange={(pageNumber) => setFilters({ ...filters, page: pageNumber })}
                        />
                    </>
                )}
            </Card>
        </section>
    );
}
