import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageDevelopmentPlans } from '../../shared/lib/roles.js';
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
    const employee = useAuthStore((s) => s.employee);
    const role = useAuthStore((s) => s.session?.role);
    const navigate = useNavigate();
    const push = useToastStore((s) => s.push);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', startDate: '', targetDate: '' });
    const [listQuery, setListQuery] = useState({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' });

    const progress = useQuery({
        queryKey: queryKeys.career.progress(employee?.id),
        enabled: Boolean(employee?.id),
        queryFn: () => careerApi.getProgress(employee.id),
    });
    const plans = useQuery({
        queryKey: [...queryKeys.career.plans(employee?.id), listQuery],
        enabled: Boolean(employee?.id),
        queryFn: async () => unwrapPage(await careerApi.listPlans(employee.id, listQuery)),
    });

    const create = useMutation({
        mutationFn: () => careerApi.createPlan({ ...form, employeeId: employee.id }),
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
                        <strong>{plans.data?.totalElements ?? list.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('development.inProgress')} · {t('common.onPage')}</span>
                        <strong className={styles.inProgress}>{active}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('development.progress')}</span>
                        <ProgressRing value={progress.data?.progressPercent ?? progress.data?.overallProgress ?? 0} />
                    </div>
                </div>
            </div>
            <div className={styles.toolbar}>
                <p className={styles.empty}>{t('development.hint')}</p>
                <div className={styles.toolbarActions}>
                    <ListFilters overlay>
                        <PageSizeField value={listQuery.size} onChange={(size) => setListQuery({ ...listQuery, size, page: 0 })} />
                    </ListFilters>
                    {canManageDevelopmentPlans(role) ? <Button onClick={() => setOpen(true)} disabled={!employee}>{t('development.create')}</Button> : null}
                </div>
            </div>
            {plans.isLoading ? <Skeleton rows={6} /> : null}
            {plans.isError ? (
                <PageState title={t('development.loadFailed')} onAction={plans.refetch} actionLabel={t('common.retry')} />
            ) : null}
            {!plans.isLoading && !plans.isError ? (
                <>
                    <div className={styles.grid}>
                        {list.map((plan) => {
                            const progress = Number(plan.progressPercent ?? 0);
                            return (
                                <article key={plan.id} className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h2>{plan.title}</h2>
                                        <Badge tone={statusTone('planStatus', plan.status)}>
                                            {enumLabel(t, 'planStatus', plan.status)}
                                        </Badge>
                                    </div>
                                    <p className={styles.description}>{plan.description || t('organization.noDescription')}</p>
                                    <div className={styles.progress}>
                                        <div className={styles.progressFill} style={{ width: `${Math.min(100, progress)}%` }} />
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('development.progress')}</span>
                                        <strong>{progress}%</strong>
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
                    <Input label={t('development.name')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <div className={page.spanAll}>
                        <Textarea label={t('development.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <Input type="date" label={t('development.start')} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                    <Input type="date" label={t('development.deadline')} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
                    </div>
                    <div className={page.row}>
                        <Button type="submit">{t('development.create')}</Button>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
