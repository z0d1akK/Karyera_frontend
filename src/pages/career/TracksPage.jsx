import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

export function TracksPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ code: '', name: '', type: 'VERTICAL', description: '' });
    const [listQuery, setListQuery] = useState({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC', status: '' });

    const query = useQuery({
        queryKey: queryKeys.career.tracks(listQuery),
        queryFn: async () => unwrapPage(await careerApi.listTracks({
            ...listQuery,
            status: listQuery.status || undefined,
        })),
    });

    const create = useMutation({
        mutationFn: () => careerApi.createTrack(form),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['career', 'tracks'] });
            setOpen(false);
            navigate(`/app/career/tracks/${data.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const list = query.data?.content || [];

    return (
        <section>
            <BackLink to="/app/career">{t('career.backToCareer')}</BackLink>
            <div className={styles.hero}>
                <div>
                    <h1>{t('career.tracksPageTitle')}</h1>
                    <p>{t('career.tracksPageSubtitle')}</p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('career.total')}</span>
                        <strong>{query.data?.totalElements ?? list.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('career.published')} · {t('common.onPage')}</span>
                        <strong className={styles.done}>{list.filter((item) => item.status === 'PUBLISHED').length}</strong>
                    </div>
                </div>
            </div>
            <ListFilters>
                <Select label={t('form.status')} value={listQuery.status} onChange={(e) => setListQuery({ ...listQuery, status: e.target.value, page: 0 })}>
                    <option value="">{t('common.all')}</option>
                    {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
                        <option key={status} value={status}>{enumLabel(t, 'trackStatus', status)}</option>
                    ))}
                </Select>
                <SortField
                    value={listQuery.sortBy}
                    direction={listQuery.sortDirection}
                    options={[{ value: 'name', label: t('career.name') }, { value: 'code', label: t('career.code') }]}
                    onChange={(sortBy, sortDirection) => setListQuery({ ...listQuery, sortBy, sortDirection, page: 0 })}
                />
                <PageSizeField value={listQuery.size} onChange={(size) => setListQuery({ ...listQuery, size, page: 0 })} />
            </ListFilters>
            <div className={styles.toolbar}>
                <p className={styles.empty}>{t('career.openTrackHint')}</p>
                {canManageHr(role) ? <Button onClick={() => setOpen(true)}>{t('career.createTrack')}</Button> : null}
            </div>
            {query.isLoading ? <Skeleton rows={6} /> : null}
            {query.isError ? (
                <PageState title={t('career.tracksFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />
            ) : null}
            {!query.isLoading && !query.isError ? (
                <>
                    <div className={styles.grid}>
                        {list.map((track) => {
                            return (
                                <article key={track.id} className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h2>{track.name}</h2>
                                        <Badge tone={statusTone('trackStatus', track.status)}>
                                            {enumLabel(t, 'trackStatus', track.status)}
                                        </Badge>
                                    </div>
                                    <p className={styles.description}>{track.description || t('organization.noDescription')}</p>
                                    <div className={styles.row}><span>{t('career.code')}</span><strong>{track.code || '—'}</strong></div>
                                    <div className={styles.row}><span>{t('career.type')}</span><strong>{enumLabel(t, 'trackType', track.type)}</strong></div>
                                    <button type="button" className={styles.more} onClick={() => navigate(`/app/career/tracks/${track.id}`)}>
                                        {t('common.more')}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                    {!list.length ? <p className={styles.footer}>{t('career.emptyTracks')}</p> : null}
                    <Pagination
                        page={query.data?.number || 0}
                        totalPages={query.data?.totalPages || 0}
                        onChange={(pageNumber) => setListQuery({ ...listQuery, page: pageNumber })}
                    />
                </>
            ) : null}
            <Modal open={open} title={t('career.newTrack')} onClose={() => setOpen(false)}>
                <form className={page.stack} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                    <div className={page.grid}>
                    <Input label={t('career.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <Input label={t('career.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Select label={t('career.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        {['VERTICAL', 'HORIZONTAL', 'MANAGEMENT', 'EXPERT'].map((type) => (
                            <option key={type} value={type}>{enumLabel(t, 'trackType', type)}</option>
                        ))}
                    </Select>
                    <div className={page.spanAll}>
                        <Textarea label={t('career.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
