import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

export function TalentReservePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const catalogs = useCatalogs();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', targetPositionId: '', targetGradeId: '', effectiveFrom: '', effectiveTo: '' });
    const [listQuery, setListQuery] = useState({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC', name: '', status: '' });

    const query = useQuery({
        queryKey: queryKeys.career.reserves(listQuery),
        queryFn: async () => unwrapPage(await careerApi.listReserves({
            ...listQuery,
            name: listQuery.name || undefined,
            status: listQuery.status || undefined,
        })),
    });

    const create = useMutation({
        mutationFn: () => careerApi.createReserve(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['career', 'reserves'] });
            setOpen(false);
            navigate(`/app/talent-reserve/${data.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const list = query.data?.content || [];
    const active = list.filter((item) => item.status === 'ACTIVE').length;

    return (
        <section>
            <div className={styles.hero}>
                <div>
                    <h1>{t('talent.title')}</h1>
                    <p>{t('talent.subtitle')}</p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('talent.pools')}</span>
                        <strong>{query.data?.totalElements ?? list.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('talent.active')} · {t('common.onPage')}</span>
                        <strong className={styles.inProgress}>{active}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('talent.candidates')}</span>
                        <strong className={styles.done}>{list.reduce((sum, item) => sum + (item.candidateCount || 0), 0)}</strong>
                    </div>
                </div>
            </div>
            <ListFilters>
                <Input label={t('dictionaries.search')} value={listQuery.name} onChange={(e) => setListQuery({ ...listQuery, name: e.target.value, page: 0 })} />
                <SortField
                    value={listQuery.sortBy}
                    direction={listQuery.sortDirection}
                    options={[{ value: 'name', label: t('talent.name') }]}
                    onChange={(sortBy, sortDirection) => setListQuery({ ...listQuery, sortBy, sortDirection, page: 0 })}
                />
                <PageSizeField value={listQuery.size} onChange={(size) => setListQuery({ ...listQuery, size, page: 0 })} />
            </ListFilters>
            <div className={styles.toolbar}>
                <p className={styles.empty}>{t('talent.hint')}</p>
                {canManageHr(role) ? <Button onClick={() => setOpen(true)}>{t('talent.create')}</Button> : null}
            </div>
            {query.isLoading ? <Skeleton rows={6} /> : null}
            {query.isError ? (
                <PageState title={t('talent.loadFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />
            ) : null}
            {!query.isLoading && !query.isError ? (
                <>
                    <div className={styles.grid}>
                        {list.map((reserve) => {
                            const position = catalogs.positions.find((item) => item.id === reserve.targetPositionId);
                            const grade = catalogs.grades.find((item) => item.id === reserve.targetGradeId);
                            return (
                                <article key={reserve.id} className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h2>{reserve.name}</h2>
                                        <Badge tone={statusTone('reserveStatus', reserve.status)}>
                                            {enumLabel(t, 'reserveStatus', reserve.status)}
                                        </Badge>
                                    </div>
                                    <p className={styles.description}>{reserve.description || t('organization.noDescription')}</p>
                                    <div className={styles.row}>
                                        <span>{t('talent.position')}</span>
                                        <strong>{catalogName(position)}</strong>
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('talent.grade')}</span>
                                        <strong>{catalogName(grade)}</strong>
                                    </div>
                                    <div className={styles.row}>
                                        <span>{t('talent.candidates')}</span>
                                        <strong>{reserve.candidateCount ?? 0}</strong>
                                    </div>
                                    <button type="button" className={styles.more} onClick={() => navigate(`/app/talent-reserve/${reserve.id}`)}>
                                        {t('common.more')}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                    {!list.length ? <p className={styles.footer}>{t('talent.empty')}</p> : null}
                    <Pagination
                        page={query.data?.number || 0}
                        totalPages={query.data?.totalPages || 0}
                        onChange={(pageNumber) => setListQuery({ ...listQuery, page: pageNumber })}
                    />
                </>
            ) : null}
            <Modal open={open} title={t('talent.newTitle')} onClose={() => setOpen(false)}>
                <form className={page.stack} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                    <div className={page.grid}>
                    <Input label={t('talent.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Select label={t('talent.position')} value={form.targetPositionId} onChange={(e) => setForm({ ...form, targetPositionId: e.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Select label={t('talent.grade')} value={form.targetGradeId} onChange={(e) => setForm({ ...form, targetGradeId: e.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Input type="date" label={t('talent.effectiveFrom')} value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
                    <Input type="date" label={t('talent.effectiveTo')} value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
                    <div className={page.spanAll}>
                        <Textarea label={t('talent.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
