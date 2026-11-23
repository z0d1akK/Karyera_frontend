import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate, fullName } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageDevelopmentPlans } from '../../shared/lib/roles.js';
import { useEmployeeNames } from '../../shared/lib/displayNames.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { ProgressRing } from '../../shared/ui/Progress/Progress.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

export function DevelopmentPage() {
    const { t } = useTranslation();
    const self = useAuthStore((s) => s.employee);
    const role = useAuthStore((s) => s.session?.role);
    const navigate = useNavigate();
    const push = useToastStore((s) => s.push);
    const employeeName = useEmployeeNames();
    const manage = canManageDevelopmentPlans(role);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(self?.id || '');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        startDate: '',
        targetDate: '',
        employeeId: self?.id || '',
    });
    const [listQuery, setListQuery] = useState({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' });

    const employeeId = manage ? selectedEmployeeId : (self?.id || '');
    const extraOptions = self?.id
        ? [{ id: self.id, label: t('development.myPlans') }]
        : [];
    const team = useQuery({
        queryKey: ['employees', 'development-team'],
        enabled: manage,
        queryFn: async () => unwrapPage(await employeeApi.list({ page: 0, size: 100, sortBy: 'lastName' })).content || [],
    });
    const resolveName = (id) => {
        if (self?.id && String(self.id) === String(id)) {
            return fullName(self);
        }
        const fromTeam = (team.data || []).find((item) => String(item.id) === String(id));
        return fromTeam ? fullName(fromTeam) : employeeName(id) || '—';
    };

    useEffect(() => {
        if (!selectedEmployeeId && self?.id) {
            setSelectedEmployeeId(self.id);
        }
        if (!form.employeeId && self?.id) {
            setForm((current) => ({ ...current, employeeId: current.employeeId || self.id }));
        }
    }, [self?.id]);

    const progress = useQuery({
        queryKey: queryKeys.career.progress(employeeId),
        enabled: Boolean(employeeId),
        retry: false,
        queryFn: async () => {
            try {
                return await careerApi.getProgress(employeeId);
            } catch (error) {
                if ([403, 404].includes(error?.response?.status)) {
                    return { progressPercent: 0, overallProgress: 0 };
                }
                throw error;
            }
        },
    });
    const plans = useQuery({
        queryKey: [...queryKeys.career.plans(employeeId), listQuery],
        enabled: Boolean(employeeId),
        retry: false,
        queryFn: async () => {
            try {
                return unwrapPage(await careerApi.listPlans(employeeId, listQuery));
            } catch (error) {
                if ([403, 404].includes(error?.response?.status)) {
                    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: listQuery.size };
                }
                throw error;
            }
        },
    });

    const create = useMutation({
        mutationFn: () => careerApi.createPlan({
            ...form,
            employeeId: manage ? (form.employeeId || employeeId) : self.id,
        }),
        onSuccess: (data) => navigate(`/app/development/plans/${data.id}`),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const list = plans.data?.content || [];
    const active = list.filter((item) => item.status === 'ACTIVE' || item.status === 'SUBMITTED').length;

    return (
        <section>
            <div className={styles.hero}>
                <div>
                    <h1>{t('development.title')}</h1>
                    <p>{t('development.subtitle')}</p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('development.total')}</span>
                        <strong>{employeeId ? (plans.data?.totalElements ?? list.length) : 0}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('development.inProgress')} · {t('common.onPage')}</span>
                        <strong className={styles.inProgress}>{active}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('development.progress')}</span>
                        <ProgressRing value={employeeId ? (progress.data?.progressPercent ?? progress.data?.overallProgress ?? 0) : 0} />
                    </div>
                </div>
            </div>
            <div className={styles.toolbar}>
                {manage ? (
                    <div className={styles.toolbarFilter}>
                        <EmployeePicker
                            searchable
                            label={t('development.employee')}
                            value={selectedEmployeeId}
                            extraOptions={extraOptions}
                            onChange={(event) => {
                                setSelectedEmployeeId(event.target.value);
                                setListQuery({ ...listQuery, page: 0 });
                            }}
                        />
                    </div>
                ) : (
                    <p className={styles.empty}>{t('development.hint')}</p>
                )}
                <div className={styles.toolbarActions}>
                    <ListFilters overlay>
                        <PageSizeField value={listQuery.size} onChange={(size) => setListQuery({ ...listQuery, size, page: 0 })} />
                    </ListFilters>
                    {manage ? (
                        <Button
                            onClick={() => {
                                setForm((current) => ({ ...current, employeeId: selectedEmployeeId || self?.id || '' }));
                                setOpen(true);
                            }}
                            disabled={!self}
                        >
                            {t('development.create')}
                        </Button>
                    ) : null}
                </div>
            </div>
            {employeeId && plans.isLoading ? <Skeleton rows={6} /> : null}
            {employeeId && plans.isError ? (
                <PageState title={t('development.loadFailed')} onAction={plans.refetch} actionLabel={t('common.retry')} />
            ) : null}
            {employeeId && !plans.isLoading && !plans.isError ? (
                <>
                    <div className={styles.grid}>
                        {list.map((plan) => {
                            const value = Number(plan.progressPercent ?? 0);
                            return (
                                <article key={plan.id} className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h2>{plan.title}</h2>
                                        <Badge tone={statusTone('planStatus', plan.status)}>
                                            {enumLabel(t, 'planStatus', plan.status)}
                                        </Badge>
                                    </div>
                                    <p className={styles.description}>{plan.description || t('organization.noDescription')}</p>
                                    {manage ? (
                                        <div className={styles.row}>
                                            <span>{t('development.employee')}</span>
                                            <strong>{resolveName(plan.employeeId)}</strong>
                                        </div>
                                    ) : null}
                                    <div className={styles.progress}>
                                        <div className={styles.progressFill} style={{ width: `${Math.min(100, value)}%` }} />
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('development.progress')}</span>
                                        <strong>{value}%</strong>
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('development.deadline')}</span>
                                        <strong>{formatDate(plan.targetDate)}</strong>
                                    </div>
                                    <button type="button" className={styles.more} onClick={() => navigate(`/app/development/plans/${plan.id}`)}>
                                        {t('common.more')}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                    {!list.length ? <p className={styles.footer}>{t('development.empty')}</p> : null}
                    <Pagination
                        page={plans.data?.number || 0}
                        totalPages={plans.data?.totalPages || 0}
                        onChange={(pageNumber) => setListQuery({ ...listQuery, page: pageNumber })}
                    />
                </>
            ) : null}
            <Modal open={open} title={t('development.newTitle')} onClose={() => setOpen(false)}>
                <form className={page.stack} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                    <div className={page.grid}>
                    {manage ? (
                        <div className={page.spanAll}>
                            <EmployeePicker
                                searchable
                                label={t('development.employee')}
                                value={form.employeeId}
                                extraOptions={extraOptions}
                                onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
                            />
                        </div>
                    ) : null}
                    <Input label={t('development.name')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <div className={page.spanAll}>
                        <Textarea label={t('development.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <Input type="date" label={t('development.start')} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                    <Input type="date" label={t('development.deadline')} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
                    </div>
                    <div className={page.row}>
                        <Button type="submit" disabled={manage && !form.employeeId}>{t('development.create')}</Button>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
