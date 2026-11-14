import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { authApi } from '../../features/auth/api/authApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { toSpringSort, unwrapPage } from '../../shared/lib/queryParams.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { fullName } from '../../shared/lib/format.js';
import { NamedLink } from '../../shared/ui/NamedLink/NamedLink.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AdminNav } from './AdminNav.jsx';

export function UsersPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ page: 0, size: 20, sortBy: 'email', sortDirection: 'ASC' });
    const people = useQuery({
        queryKey: ['employees', 'directory-names'],
        queryFn: async () => unwrapPage(await employeeApi.list({ page: 0, size: 100, sortBy: 'lastName' })).content || [],
    });
    const employeeName = (id) => {
        const person = (people.data || []).find((item) => item.id === id);
        return person ? fullName(person) : null;
    };
    const query = useQuery({
        queryKey: queryKeys.catalogs.users(filters),
        queryFn: async () => unwrapPage(await authApi.getUsers({
            page: filters.page,
            size: filters.size,
            sort: toSpringSort(filters.sortBy, filters.sortDirection),
        })),
    });

    return (
        <section>
            <PageHeader
                title={t('navigation.admin')}
                actions={<Button onClick={() => navigate('/app/admin/users/new')}>{t('admin.createAccount')}</Button>}
            />
            <AdminNav />
            <StatRow>
                <StatTile label={t('admin.usersTitle')} value={query.data?.totalElements ?? 0} />
                <StatTile label={`${t('admin.active')} · ${t('common.onPage')}`} tone="success" value={(query.data?.content || []).filter((row) => row.active).length} />
            </StatRow>
            <ListFilters>
                <SortField
                    value={filters.sortBy}
                    direction={filters.sortDirection}
                    options={[
                        { value: 'email', label: t('admin.loginEmail') },
                        { value: 'role', label: t('admin.role') },
                    ]}
                    onChange={(sortBy, sortDirection) => setFilters({ ...filters, sortBy, sortDirection, page: 0 })}
                />
                <PageSizeField value={filters.size} onChange={(size) => setFilters({ ...filters, size, page: 0 })} />
            </ListFilters>
            <Card>
                {query.isLoading ? <Skeleton /> : (
                    <DataTable
                        rows={query.data?.content || []}
                        onRowClick={(row) => navigate(`/app/admin/users/${row.id}`)}
                        columns={[
                            { key: 'email', sortKey: 'email', header: t('admin.loginEmail') },
                            { key: 'role', sortKey: 'role', header: t('admin.role'), render: (row) => enumLabel(t, 'role', row.role) },
                            { key: 'employeeId', header: t('admin.employee'), render: (row) => (
                                <NamedLink to={row.employeeId ? `/app/employees/${row.employeeId}` : null} name={employeeName(row.employeeId)} />
                            ) },
                            {
                                key: 'active',
                                sortKey: 'active',
                                header: t('admin.status'),
                                render: (row) => (
                                    <Badge tone={row.active ? 'success' : 'danger'}>
                                        {row.active ? t('admin.active') : t('admin.blocked')}
                                    </Badge>
                                ),
                            },
                        ]}
                    />
                )}
                <Pagination
                    page={query.data?.number || 0}
                    totalPages={query.data?.totalPages || 0}
                    size={filters.size}
                    onChange={(pageNumber) => setFilters({ ...filters, page: pageNumber })}
                    onSizeChange={(size) => setFilters({ ...filters, size, page: 0 })}
                />
            </Card>
        </section>
    );
}
