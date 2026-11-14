import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select, Input, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton, PageState } from '../../shared/ui/PageState/PageState.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

export function CareerPage() {
    const { t } = useTranslation();
    const employee = useAuthStore((s) => s.employee);
    const catalogs = useCatalogs();
    const navigate = useNavigate();
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ targetPositionId: '', targetGradeId: '', motivation: '', targetDate: '' });
    const [editingId, setEditingId] = useState(null);
    const [goalOpen, setGoalOpen] = useState(false);
    const [goalQuery, setGoalQuery] = useState({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' });
    const [trackQuery, setTrackQuery] = useState({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC' });

    const goals = useQuery({
        queryKey: [...queryKeys.career.goals(employee?.id), goalQuery],
        enabled: Boolean(employee?.id),
        queryFn: async () => unwrapPage(await careerApi.listGoals(employee.id, goalQuery)),
    });
    const tracks = useQuery({
        queryKey: queryKeys.career.tracks(trackQuery),
        queryFn: async () => unwrapPage(await careerApi.listTracks(trackQuery)),
    });
    const available = useQuery({
        queryKey: ['career', 'available', employee?.id],
        enabled: Boolean(employee?.id),
        queryFn: () => careerApi.availableTracks(employee.id),
    });

    const create = useMutation({
        mutationFn: () => careerApi.createGoal(employee.id, Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))),
        onSuccess: () => {
            setGoalOpen(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.career.goals(employee.id) });
            push({ type: 'success', message: t('career.goalCreated') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const transition = useMutation({
        mutationFn: ({ id, action, version }) => careerApi[action](id, { expectedVersion: version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.career.goals(employee.id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const updateGoal = useMutation({
        mutationFn: () => careerApi.updateGoal(editingId, Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))),
        onSuccess: () => {
            setEditingId(null);
            setGoalOpen(false);
            setForm({ targetPositionId: '', targetGradeId: '', motivation: '', targetDate: '' });
            queryClient.invalidateQueries({ queryKey: queryKeys.career.goals(employee.id) });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (!employee) {
        return <Skeleton />;
    }

    const goalList = goals.data?.content || [];
    const trackList = tracks.data?.content || [];
    const active = goalList.find((item) => item.status === 'ACTIVE') || goalList[0];
    const activeMeta = {
        label: active ? enumLabel(t, 'careerGoalStatus', active.status) : null,
        tone: statusTone('careerGoalStatus', active?.status),
    };

    return (
        <section>
            <div className={styles.hero}>
                <div>
                    <h1>{t('career.title')}</h1>
                    <p>
                        {t('career.subtitle', {
                            position: catalogName(employee.position),
                            grade: catalogName(employee.grade),
                        })}
                    </p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('career.goals')}</span>
                        <strong>{goals.data?.totalElements ?? goalList.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('career.active')} · {t('common.onPage')}</span>
                        <strong className={styles.inProgress}>{goalList.filter((item) => item.status === 'ACTIVE').length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('career.tracks')}</span>
                        <strong className={styles.done}>{tracks.data?.totalElements ?? trackList.length}</strong>
                    </div>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.chips}>
                    <Button variant="ghost" onClick={() => navigate('/app/analytics/me')}>{t('analyticsUi.recommendations')}</Button>
                    <Button variant="ghost" onClick={() => navigate('/app/analytics/me/career-options', { state: { from: '/app/career' } })}>{t('analyticsUi.careerOptions')}</Button>
                </div>
                <div className={styles.toolbarActions}>
                    <Button onClick={() => { setEditingId(null); setForm({ targetPositionId: '', targetGradeId: '', motivation: '', targetDate: '' }); setGoalOpen(true); }}>{t('career.newGoal')}</Button>
                </div>
            </div>

            {goals.isError ? (
                <PageState title={t('career.goalsFailed')} onAction={goals.refetch} actionLabel={t('common.retry')} />
            ) : (
                <div className={styles.gridTwo}>
                    <article className={`${styles.card} ${styles.compactCard}`}>
                        <div className={styles.cardHead}>
                            <h2>{t('career.currentGoal')}</h2>
                            {active ? <Badge tone={activeMeta.tone}>{activeMeta.label}</Badge> : null}
                        </div>
                        {active ? (
                            <>
                                <p className={styles.description}>
                                    {active.targetPositionName || catalogs.positions.find((item) => item.id === active.targetPositionId)?.name || t('career.targetPosition')}
                                </p>
                                <div className={styles.row}>
                                    <span>{t('career.deadline')}</span>
                                    <strong>{formatDate(active.targetDate)}</strong>
                                </div>
                                <div className={styles.row}>
                                    <span>{t('career.motivation')}</span>
                                    <strong>{active.motivation || '—'}</strong>
                                </div>
                                <div className={styles.actions}>
                                    {active.status === 'PROPOSED' ? (
                                        <Button onClick={() => transition.mutate({ id: active.id, action: 'activateGoal', version: active.version })}>{t('career.activateGoal')}</Button>
                                    ) : null}
                                    {active.status === 'ACTIVE' ? (
                                        <Button onClick={() => transition.mutate({ id: active.id, action: 'achieveGoal', version: active.version })}>{t('career.achieveGoal')}</Button>
                                    ) : null}
                                    {active.status !== 'CANCELLED' && active.status !== 'ACHIEVED' ? (
                                        <Button variant="danger" onClick={() => transition.mutate({ id: active.id, action: 'cancelGoal', version: active.version })}>{t('career.cancelGoal')}</Button>
                                    ) : null}
                                    {active.status !== 'CANCELLED' && active.status !== 'ACHIEVED' ? (
                                    <Button variant="secondary" onClick={() => {
                                        setEditingId(active.id);
                                        setForm({
                                            targetPositionId: active.targetPositionId || '',
                                            targetGradeId: active.targetGradeId || '',
                                            motivation: active.motivation || '',
                                            targetDate: active.targetDate || '',
                                        });
                                        setGoalOpen(true);
                                    }}>{t('common.edit')}</Button>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <p className={styles.empty}>{t('career.noGoal')}</p>
                        )}
                        <button type="button" className={styles.more} onClick={() => navigate('/app/development')}>
                            {t('career.toDevelopment')}
                        </button>
                    </article>
                    <article className={`${styles.card} ${styles.compactCard}`}>
                        <div className={styles.cardHead}>
                            <h2>{t('career.availableTracks')}</h2>
                        </div>
                        {(Array.isArray(available.data) ? available.data : available.data?.content || []).map((track) => (
                            <div key={track.id || track.trackId} className={styles.row}>
                                <span>{track.name || track.trackName || track.code}</span>
                                <button type="button" className={styles.more} onClick={() => navigate(`/app/career/tracks/${track.id || track.trackId}`)}>
                                    {t('common.more')}
                                </button>
                            </div>
                        ))}
                        {!available.isLoading && !(Array.isArray(available.data) ? available.data : available.data?.content || []).length ? (
                            <p className={styles.empty}>{t('career.noAvailableTracks')}</p>
                        ) : null}
                    </article>
                </div>
            )}

            <div className={`${styles.toolbar} ${styles.block}`}>
                <h2 className={styles.sectionTitle}>{t('career.tracksTitle')}</h2>
                <div className={styles.toolbarActions}>
                    <ListFilters overlay>
                        <SortField
                            value={trackQuery.sortBy}
                            direction={trackQuery.sortDirection}
                            options={[
                                { value: 'name', label: t('career.name') },
                                { value: 'code', label: t('career.code') },
                            ]}
                            onChange={(sortBy, sortDirection) => setTrackQuery({ ...trackQuery, sortBy, sortDirection, page: 0 })}
                        />
                        <PageSizeField value={trackQuery.size} onChange={(size) => setTrackQuery({ ...trackQuery, size, page: 0 })} />
                    </ListFilters>
                    <Button variant="ghost" onClick={() => navigate('/app/career/tracks')}>{t('career.allTracks')}</Button>
                </div>
            </div>
            {tracks.isLoading ? <Skeleton rows={4} /> : (
                <div className={`${styles.grid} ${styles.compactGrid}`}>
                    {trackList.map((track) => (
                        <article key={track.id} className={`${styles.card} ${styles.compactCard}`}>
                            <div className={styles.cardHead}>
                                <h2>{track.name}</h2>
                                <Badge tone={statusTone('trackStatus', track.status)}>
                                    {enumLabel(t, 'trackStatus', track.status)}
                                </Badge>
                            </div>
                            <p className={styles.description}>{track.description || t('organization.noDescription')}</p>
                            <div className={styles.row}>
                                <span>{t('career.code')}</span>
                                <strong>{track.code || '—'}</strong>
                            </div>
                            <div className={styles.row}>
                                <span>{t('career.type')}</span>
                                <strong>{enumLabel(t, 'trackType', track.type)}</strong>
                            </div>
                            <button type="button" className={styles.more} onClick={() => navigate(`/app/career/tracks/${track.id}`)}>
                                {t('common.more')}
                            </button>
                        </article>
                    ))}
                </div>
            )}
            {!tracks.isLoading && !trackList.length ? <p className={styles.footer}>{t('career.noTracks')}</p> : null}
            <Pagination
                page={tracks.data?.number || 0}
                totalPages={tracks.data?.totalPages || 0}
                onChange={(pageNumber) => setTrackQuery({ ...trackQuery, page: pageNumber })}
            />
            <Modal open={goalOpen} title={editingId ? t('career.saveChanges') : t('career.newGoal')} onClose={() => { setGoalOpen(false); setEditingId(null); }}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <Select label={t('career.targetPosition')} value={form.targetPositionId} onChange={(e) => setForm({ ...form, targetPositionId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                        <Select label={t('career.targetGrade')} value={form.targetGradeId} onChange={(e) => setForm({ ...form, targetGradeId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                        <Input type="date" label={t('career.deadline')} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('career.motivation')} value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} />
                        </div>
                    </div>
                    <div className={page.row}>
                        {editingId ? (
                            <Button onClick={() => updateGoal.mutate()} disabled={!form.targetPositionId}>{t('career.saveChanges')}</Button>
                        ) : (
                            <Button onClick={() => create.mutate()} disabled={!form.targetPositionId}>{t('career.saveGoal')}</Button>
                        )}
                        <Button variant="ghost" onClick={() => { setGoalOpen(false); setEditingId(null); }}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
