import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectApi } from '../../features/projects/api/projectApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canCreateProject } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

const FILTERS = [
    { id: 'ALL', labelKey: 'projects.filterAll' },
    { id: 'ACTIVE', labelKey: 'projects.filterActive' },
    { id: 'COMPLETED', labelKey: 'projects.filterCompleted' },
    { id: 'PLANNED', labelKey: 'projects.filterPlanned' },
];

export function ProjectsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.session?.role);
    const employeeId = useAuthStore((s) => s.employee?.id);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [queryState, setQueryState] = useState({
        page: 0,
        size: 20,
        sortBy: 'name',
        sortDirection: 'ASC',
        status: 'ALL',
    });
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        projectManagerId: '',
        deliveryManagerId: '',
    });

    const listParams = {
        page: queryState.page,
        size: queryState.size,
        sortBy: queryState.sortBy,
        sortDirection: queryState.sortDirection,
        status: queryState.status === 'ALL' ? undefined : queryState.status,
    };

    const query = useQuery({
        queryKey: [...queryKeys.projects.all(listParams), employeeId],
        queryFn: async () => {
            const listed = unwrapPage(await projectApi.list(listParams));
            const content = await Promise.all((listed.content || []).map(async (project) => {
                if (!employeeId) {
                    return project;
                }
                try {
                    const assignments = unwrapPage(await projectApi.listAssignments(project.id, { page: 0, size: 100 }));
                    const mine = (assignments.content || []).find((item) => item.employeeId === employeeId);
                    return {
                        ...project,
                        joinedAt: mine?.startDate,
                        leftAt: mine?.endDate,
                    };
                } catch {
                    return project;
                }
            }));
            return { ...listed, content };
        },
    });

    const counts = useQuery({
        queryKey: ['projects', 'counts'],
        queryFn: async () => {
            const [all, active, completed] = await Promise.all([
                projectApi.list({ page: 0, size: 1 }),
                projectApi.list({ page: 0, size: 1, status: 'ACTIVE' }),
                projectApi.list({ page: 0, size: 1, status: 'COMPLETED' }),
            ]);
            return {
                total: unwrapPage(all).totalElements,
                active: unwrapPage(active).totalElements,
                completed: unwrapPage(completed).totalElements,
            };
        },
    });

    const create = useMutation({
        mutationFn: () => projectApi.create(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setOpen(false);
            navigate(`/app/projects/${data.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const projects = useMemo(() => query.data?.content || [], [query.data]);

    return (
        <section>
            <div className={styles.hero}>
                <div>
                    <h1>{t('projects.title')}</h1>
                    <p>{t('projects.subtitle')}</p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('projects.total')}</span>
                        <strong>{counts.data?.total ?? query.data?.totalElements ?? 0}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('projects.inProgress')}</span>
                        <strong className={styles.inProgress}>{counts.data?.active ?? 0}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('projects.completed')}</span>
                        <strong className={styles.done}>{counts.data?.completed ?? 0}</strong>
                    </div>
                </div>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.chips}>
                    {FILTERS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.chip} ${queryState.status === item.id ? styles.chipActive : ''}`}
                            onClick={() => setQueryState({ ...queryState, status: item.id, page: 0 })}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                </div>
                {canCreateProject(role) ? (
                    <Button onClick={() => setOpen(true)}>{t('projects.create')}</Button>
                ) : null}
            </div>
            <ListFilters>
                <SortField
                    value={queryState.sortBy}
                    direction={queryState.sortDirection}
                    options={[
                        { value: 'name', label: t('projects.name') },
                        { value: 'code', label: t('projects.code') },
                        { value: 'startDate', label: t('projects.startDate') },
                    ]}
                    onChange={(sortBy, sortDirection) => setQueryState({ ...queryState, sortBy, sortDirection, page: 0 })}
                />
                <PageSizeField value={queryState.size} onChange={(size) => setQueryState({ ...queryState, size, page: 0 })} />
            </ListFilters>
            {query.isLoading ? <Skeleton rows={6} /> : null}
            {query.isError ? (
                <PageState title={t('projects.loadFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />
            ) : null}
            {!query.isLoading && !query.isError ? (
                <>
                    <div className={styles.grid}>
                        {projects.map((project) => {
                            return (
                                <article key={project.id} className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h2>{project.name}</h2>
                                        <Badge tone={statusTone('projectStatus', project.status)}>
                                            {enumLabel(t, 'projectStatus', project.status)}
                                        </Badge>
                                    </div>
                                    <p className={styles.description}>{project.description || t('organization.noDescription')}</p>
                                    <div className={styles.row}>
                                        <span>{t('projects.joinedAt')}</span>
                                        <strong>{formatDate(project.joinedAt)}</strong>
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('projects.leftAt')}</span>
                                        <strong>{formatDate(project.leftAt)}</strong>
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('projects.deliveryManager')}</span>
                                        <strong>{project.deliveryManager?.fullName || '—'}</strong>
                                    </div>
                                    <button type="button" className={styles.more} onClick={() => navigate(`/app/projects/${project.id}`)}>
                                        {t('common.more')}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                    {!projects.length ? <p className={styles.footer}>{t('projects.empty')}</p> : (
                        <p className={styles.footer}>{t('projects.shown', { shown: projects.length, total: query.data?.totalElements || projects.length })}</p>
                    )}
                    <Pagination
                        page={query.data?.number || 0}
                        totalPages={query.data?.totalPages || 0}
                        onChange={(pageNumber) => setQueryState({ ...queryState, page: pageNumber })}
                    />
                </>
            ) : null}
            <Modal open={open} title={t('projects.newTitle')} onClose={() => setOpen(false)}>
                <form className={page.stack} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                    <div className={page.grid}>
                        <Input label={t('projects.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                        <Input label={t('projects.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <Input label={t('projects.startDate')} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                        <Input label={t('projects.endDate')} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                        <EmployeePicker label={t('projects.projectManager')} value={form.projectManagerId} onChange={(e) => setForm({ ...form, projectManagerId: e.target.value })} />
                        <EmployeePicker label={t('projects.deliveryManager')} value={form.deliveryManagerId} onChange={(e) => setForm({ ...form, deliveryManagerId: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('projects.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                    </div>
                    <div className={page.row}>
                        <Button type="submit">{t('common.create')}</Button>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
