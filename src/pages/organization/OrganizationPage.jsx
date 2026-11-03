import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, fullName } from '../../shared/lib/format.js';
import { canSeeDirectory } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { ListFilters, PageSizeField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import styles from './OrganizationPage.module.css';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';

function DepartmentMembers({ departmentId }) {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const canOpenProfile = canSeeDirectory(role);
    const [pageNumber, setPageNumber] = useState(0);
    const [size, setSize] = useState(20);
    const members = useQuery({
        queryKey: queryKeys.employees.all({ departmentId, page: pageNumber, size, sortBy: 'lastName' }),
        queryFn: async () => unwrapPage(await employeeApi.list({
            departmentId,
            page: pageNumber,
            size,
            sortBy: 'lastName',
            sortDirection: 'ASC',
        })),
    });

    if (members.isLoading) {
        return <Skeleton rows={2} />;
    }

    const rows = members.data?.content || [];
    const shown = (members.data?.number || 0) * (members.data?.size || size) + rows.length;
    const total = members.data?.totalElements || 0;

    return (
        <>
            <Badge tone="accent">{t('organization.membersCount', { count: total })}</Badge>
            {rows.length ? rows.map((employee) => (
                canOpenProfile ? (
                    <Link key={employee.id} className={styles.person} to={`/app/employees/${employee.id}`}>
                        <span className={styles.name}>{fullName(employee)}</span>
                        <span className={styles.role}>{catalogName(employee.position)}</span>
                    </Link>
                ) : (
                    <div key={employee.id} className={styles.person}>
                        <span className={styles.name}>{fullName(employee)}</span>
                        <span className={styles.role}>{catalogName(employee.position)}</span>
                    </div>
                )
            )) : <p className={styles.empty}>{t('organization.emptyMembers')}</p>}
            {shown < total ? (
                <Button variant="ghost" onClick={() => setSize((current) => Math.min(100, current + 20))}>
                    {t('common.loadMore')}
                </Button>
            ) : null}
        </>
    );
}

export function OrganizationPage() {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC', name: '' });
    const departments = useQuery({
        queryKey: queryKeys.catalogs.departments(filters),
        queryFn: async () => unwrapPage(await employeeApi.listDepartments(filters)),
    });

    if (departments.isLoading) {
        return <Skeleton rows={8} />;
    }

    if (departments.isError) {
        return (
            <PageState
                title={t('organization.loadFailed')}
                description={t('organization.loadHint')}
                actionLabel={t('common.retry')}
                onAction={() => departments.refetch()}
            />
        );
    }

    const departmentList = departments.data?.content || [];

    return (
        <section>
            <PageHeader
                title={t('organization.title')}
                description={t('organization.description')}
            />
            <ListFilters>
                <Input
                    label={t('organization.search')}
                    value={filters.name}
                    onChange={(event) => setFilters({ ...filters, name: event.target.value, page: 0 })}
                />
                <PageSizeField value={filters.size} onChange={(size) => setFilters({ ...filters, size, page: 0 })} />
            </ListFilters>
            {!departmentList.length ? (
                <PageState title={t('organization.emptyDepartments')} description={t('organization.emptyHint')} />
            ) : (
                <>
                    <div className={styles.grid}>
                        {departmentList.map((department) => (
                            <article key={department.id} className={styles.card}>
                                <div className={styles.cardHead}>
                                    <h2>{department.name}</h2>
                                </div>
                                <p className={styles.description}>{department.description || t('organization.noDescription')}</p>
                                <DepartmentMembers departmentId={department.id} />
                            </article>
                        ))}
                    </div>
                    <Pagination
                        page={departments.data?.number || 0}
                        totalPages={departments.data?.totalPages || 0}
                        onChange={(pageNumber) => setFilters({ ...filters, page: pageNumber })}
                    />
                </>
            )}
        </section>
    );
}
