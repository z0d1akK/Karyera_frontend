import { useMemo, useState } from 'react';
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
import styles from './OrganizationPage.module.css';

function personId(person) {
    return person?.id ? String(person.id) : '';
}

function managerIdOf(employee) {
    const items = employee.responsibilities || [];
    const active = items.find((item) => !item.endDate) || items[0];
    const id = active?.responsibleEmployee?.id || active?.responsibleEmployeeId;
    return id ? String(id) : null;
}

function uniquePeople(people) {
    const byId = new Map();
    people.forEach((person) => {
        const id = personId(person);
        if (id) {
            byId.set(id, person);
        }
    });
    return [...byId.values()];
}

function buildForest(people) {
    const unique = uniquePeople(people);
    const byId = new Map(unique.map((person) => [personId(person), person]));
    const children = new Map(unique.map((person) => [personId(person), []]));
    const childIds = new Set();
    unique.forEach((person) => {
        const managerId = managerIdOf(person);
        const id = personId(person);
        if (managerId && byId.has(managerId) && managerId !== id) {
            children.get(managerId).push(person);
            childIds.add(id);
        }
    });
    const roots = unique.filter((person) => !childIds.has(personId(person)));
    return { roots, children };
}

function OrgNode({ person, childrenMap, canOpenProfile }) {
    const kids = childrenMap.get(person.id) || [];
    const box = (
        <div className={styles.box}>
            <strong>{fullName(person)}</strong>
            <span>{catalogName(person.position)}</span>
        </div>
    );
    return (
        <div className={styles.branch}>
            {canOpenProfile ? <Link className={styles.boxLink} to={`/app/employees/${person.id}`}>{box}</Link> : box}
            {kids.length ? (
                <>
                    <div className={styles.stem} />
                    <div className={styles.level}>
                        {kids.map((child) => (
                            <OrgNode key={personId(child)} person={child} childrenMap={childrenMap} canOpenProfile={canOpenProfile} />
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function DepartmentTree({ departmentId }) {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const canOpenProfile = canSeeDirectory(role);
    const query = useQuery({
        queryKey: ['organization-tree', departmentId],
        enabled: Boolean(departmentId),
        queryFn: async () => {
            const listed = unwrapPage(await employeeApi.list({
                departmentId,
                page: 0,
                size: 100,
                sortBy: 'lastName',
                sortDirection: 'ASC',
            }));
            let rows = listed.content || [];
            if (!rows.length) {
                const all = unwrapPage(await employeeApi.list({
                    page: 0,
                    size: 100,
                    sortBy: 'lastName',
                    sortDirection: 'ASC',
                }));
                rows = (all.content || []).filter((person) => String(person.department?.id || person.departmentId) === String(departmentId));
            }
            const people = await Promise.all(rows.map((person) => employeeApi.getById(person.id)));
            return uniquePeople(people);
        },
    });

    if (query.isLoading) {
        return <Skeleton rows={4} />;
    }

    if (query.isError) {
        return (
            <PageState
                title={t('organization.loadFailed')}
                actionLabel={t('common.retry')}
                onAction={() => query.refetch()}
            />
        );
    }

    const people = query.data || [];
    if (!people.length) {
        return <p className={styles.empty}>{t('organization.emptyMembers')}</p>;
    }

    const { roots, children } = buildForest(people);
    return (
        <div className={styles.chart}>
            <Badge tone="accent">{t('organization.membersCount', { count: people.length })}</Badge>
            <div className={styles.forest}>
                {roots.map((person) => (
                    <OrgNode key={personId(person)} person={person} childrenMap={children} canOpenProfile={canOpenProfile} />
                ))}
            </div>
        </div>
    );
}

export function OrganizationPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const departments = useQuery({
        queryKey: queryKeys.catalogs.departments({ size: 100, sortBy: 'name' }),
        queryFn: async () => unwrapPage(await employeeApi.listDepartments({
            page: 0,
            size: 100,
            sortBy: 'name',
            sortDirection: 'ASC',
            active: true,
        })),
    });
    const employees = useQuery({
        queryKey: ['organization-people'],
        queryFn: async () => unwrapPage(await employeeApi.list({
            page: 0,
            size: 100,
            sortBy: 'lastName',
            sortDirection: 'ASC',
        })),
    });

    const departmentList = useMemo(() => {
        const rows = departments.data?.content || [];
        const query = search.trim().toLowerCase();
        if (!query) {
            return rows;
        }
        const matchedIds = new Set((employees.data?.content || [])
            .filter((person) => {
                const haystack = `${fullName(person)} ${person.email || ''} ${catalogName(person.position)}`.toLowerCase();
                return haystack.includes(query);
            })
            .map((person) => person.department?.id || person.departmentId)
            .filter(Boolean)
            .map(String));
        return rows.filter((department) => (
            department.name.toLowerCase().includes(query)
            || (department.description || '').toLowerCase().includes(query)
            || matchedIds.has(String(department.id))
        ));
    }, [departments.data, employees.data, search]);

    const selected = departmentList.find((item) => item.id === selectedId) || (departments.data?.content || []).find((item) => item.id === selectedId);

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

    return (
        <section>
            <PageHeader
                title={t('organization.title')}
                description={t('organization.description')}
            />
            {selected ? (
                <article className={styles.treeCard}>
                    <div className={styles.cardHead}>
                        <h2>{selected.name}</h2>
                        <Button variant="ghost" onClick={() => setSelectedId(null)}>{t('organization.backToDepartments')}</Button>
                    </div>
                    <p className={styles.description}>{selected.description || t('organization.noDescription')}</p>
                    <DepartmentTree departmentId={selected.id} />
                </article>
            ) : (
                <>
            <div className={styles.toolbar}>
                <Input
                    label={t('organization.search')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>
            {!departmentList.length ? (
                <PageState title={t('organization.emptyDepartments')} description={t('organization.emptyHint')} />
            ) : (
                <div className={styles.grid}>
                    {departmentList.map((department) => (
                        <button
                            key={department.id}
                            type="button"
                            className={styles.card}
                            onClick={() => setSelectedId(department.id)}
                        >
                            <div className={styles.cardHead}>
                                <h2>{department.name}</h2>
                            </div>
                            <p className={styles.description}>{department.description || t('organization.noDescription')}</p>
                            <span className={styles.openHint}>{t('organization.openTree')}</span>
                        </button>
                    ))}
                </div>
            )}
                </>
            )}
        </section>
    );
}
