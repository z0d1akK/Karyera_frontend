import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import catalog from '../../shared/styles/catalog.module.css';
import styles from './TrackGraph.module.css';

function catalogLabel(list, id) {
    if (!id) {
        return '';
    }
    return list.find((item) => String(item.id) === String(id))?.name || '';
}

export function TrackDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const catalogs = useCatalogs();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [node, setNode] = useState({ positionId: '', gradeId: '', label: '', displayOrder: 0, isEntryPoint: false });
    const [editingNode, setEditingNode] = useState(null);
    const [trackName, setTrackName] = useState('');
    const [trackDescription, setTrackDescription] = useState('');
    const [transition, setTransition] = useState({ sourceNodeId: '', targetNodeId: '', transitionType: 'PROMOTION' });
    const [trackOpen, setTrackOpen] = useState(false);
    const [nodeOpen, setNodeOpen] = useState(false);
    const [transitionOpen, setTransitionOpen] = useState(false);

    const query = useQuery({ queryKey: queryKeys.career.track(id), queryFn: () => careerApi.getTrack(id) });
    const invalidate = (data) => {
        if (data) {
            queryClient.setQueryData(queryKeys.career.track(id), data);
        }
        queryClient.invalidateQueries({ queryKey: ['career', 'tracks'] });
        queryClient.invalidateQueries({ queryKey: ['career', 'available'] });
    };
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const nodeTitle = (item) => (
        item.label
        || catalogLabel(catalogs.positions, item.positionId)
        || t('career.node')
    );
    const nodePayload = (item) => ({
        ...item,
        displayOrder: Number(item.displayOrder),
        isEntryPoint: Boolean(item.isEntryPoint),
        label: item.label || catalogLabel(catalogs.positions, item.positionId),
    });

    const addNode = useMutation({
        mutationFn: () => careerApi.addNode(id, nodePayload(node)),
        onSuccess: () => {
            setNodeOpen(false);
            invalidate();
        },
        onError,
    });
    const addTransition = useMutation({
        mutationFn: () => careerApi.addTransition(id, transition),
        onSuccess: () => {
            setTransitionOpen(false);
            invalidate();
        },
        onError,
    });
    const publish = useMutation({ mutationFn: () => careerApi.publishTrack(id), onSuccess: invalidate, onError });
    const archive = useMutation({ mutationFn: () => careerApi.archiveTrack(id), onSuccess: invalidate, onError });
    const saveTrack = useMutation({
        mutationFn: (payload) => careerApi.updateTrack(id, payload),
        onSuccess: () => {
            setTrackOpen(false);
            invalidate();
        },
        onError,
    });
    const removeNode = useMutation({ mutationFn: (nodeId) => careerApi.deleteNode(nodeId), onSuccess: invalidate, onError });
    const saveNode = useMutation({
        mutationFn: () => careerApi.updateNode(editingNode.id, {
            positionId: editingNode.positionId,
            gradeId: editingNode.gradeId,
            label: editingNode.label || catalogLabel(catalogs.positions, editingNode.positionId),
            description: editingNode.description,
            displayOrder: Number(editingNode.displayOrder),
            isEntryPoint: Boolean(editingNode.isEntryPoint),
        }),
        onSuccess: () => {
            setEditingNode(null);
            invalidate();
        },
        onError,
    });
    const removeTransition = useMutation({ mutationFn: (transitionId) => careerApi.deleteTransition(transitionId), onSuccess: invalidate, onError });

    if (query.isLoading) {
        return <Skeleton />;
    }

    if (query.isError || !query.data) {
        return <PageState title={t('career.loadTrackFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />;
    }

    const track = query.data;
    const nodes = [...(track.nodes || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const transitions = track.transitions || [];
    const canEdit = canManageHr(role);
    const draft = track.status === 'DRAFT';

    return (
        <section className={styles.layout}>
            <div>
                <BackLink to="/app/career/tracks">{t('career.backToTracks')}</BackLink>
                <PageHeader
                    title={track.name}
                    description={[track.code, enumLabel(t, 'trackType', track.type)].filter(Boolean).join(' · ')}
                    actions={(
                        <Badge tone={statusTone('trackStatus', track.status)}>
                            {enumLabel(t, 'trackStatus', track.status)}
                        </Badge>
                    )}
                />
            </div>
            {canEdit ? (
                <div className={catalog.toolbar}>
                    <p className={catalog.empty}>{track.description || t('career.openTrackHint')}</p>
                    <div className={catalog.toolbarActions}>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setTrackName(track.name);
                                setTrackDescription(track.description || '');
                                setTrackOpen(true);
                            }}
                        >
                            {t('career.editTrack')}
                        </Button>
                        {draft ? (
                            <Button variant="secondary" onClick={() => setNodeOpen(true)}>{t('career.addNode')}</Button>
                        ) : null}
                        {draft ? (
                            <Button onClick={() => setTransitionOpen(true)}>{t('career.addTransition')}</Button>
                        ) : null}
                        {draft ? <Button variant="coral" onClick={() => publish.mutate()}>{t('career.publish')}</Button> : null}
                        {track.status === 'PUBLISHED' ? (
                            <Button variant="ghost" onClick={() => archive.mutate()}>{t('career.archive')}</Button>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <div className={styles.graph}>
                {nodes.map((item, index) => {
                    const positionName = catalogLabel(catalogs.positions, item.positionId);
                    const gradeName = catalogLabel(catalogs.grades, item.gradeId);
                    return (
                        <Fragment key={item.id}>
                            <article className={`${catalog.card} ${catalog.compactCard} ${styles.node}`}>
                                <div className={catalog.cardHead}>
                                    <h2>{nodeTitle(item)}</h2>
                                    {item.isEntryPoint ? <Badge tone="warning">{t('career.entryPoint')}</Badge> : null}
                                </div>
                                {item.description ? <p className={catalog.description}>{item.description}</p> : null}
                                <div className={catalog.row}>
                                    <span>{t('form.position')}</span>
                                    <strong>{positionName || '—'}</strong>
                                </div>
                                <div className={catalog.row}>
                                    <span>{t('form.grade')}</span>
                                    <strong>{gradeName || '—'}</strong>
                                </div>
                                <div className={styles.nodeFooter}>
                                    {item.positionId ? (
                                        <Link
                                            className={catalog.more}
                                            to={`/app/career/positions/${item.positionId}${item.gradeId ? `?gradeId=${item.gradeId}` : ''}`}
                                            state={{ fromTrack: `/app/career/tracks/${id}` }}
                                        >
                                            {t('career.positionRequirements')}
                                        </Link>
                                    ) : <span />}
                                    {canEdit && draft ? (
                                        <div className={styles.nodeFooterActions}>
                                            <Button variant="secondary" onClick={() => setEditingNode(item)}>{t('common.edit')}</Button>
                                            <Button variant="danger" onClick={() => removeNode.mutate(item.id)}>{t('career.deleteNode')}</Button>
                                        </div>
                                    ) : null}
                                </div>
                            </article>
                            {index < nodes.length - 1 ? <div className={styles.arrow} aria-hidden>↓</div> : null}
                        </Fragment>
                    );
                })}
                {!nodes.length ? <p className={catalog.empty}>{t('career.noNodes')}</p> : null}
            </div>
            <article className={`${catalog.card} ${catalog.compactCard}`}>
                <h2 className={catalog.sectionTitle}>{t('career.transitions')}</h2>
                {!transitions.length ? <p className={catalog.empty}>{t('career.noTransitions')}</p> : null}
                <div className={styles.transitions}>
                    {transitions.map((item) => {
                        const source = nodes.find((nodeItem) => nodeItem.id === item.sourceNodeId);
                        const target = nodes.find((nodeItem) => nodeItem.id === item.targetNodeId);
                        return (
                            <div key={item.id} className={styles.transition}>
                                <div className={styles.transitionMeta}>
                                    <Badge>{enumLabel(t, 'transitionType', item.transitionType)}</Badge>
                                    <p className={styles.path}>
                                        {source ? nodeTitle(source) : '—'} → {target ? nodeTitle(target) : '—'}
                                    </p>
                                </div>
                                {canEdit && draft ? (
                                    <Button variant="danger" onClick={() => removeTransition.mutate(item.id)}>
                                        {t('career.deleteTransition')}
                                    </Button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </article>
            <Modal open={trackOpen} title={t('career.editTrack')} onClose={() => setTrackOpen(false)}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <Input label={t('career.name')} value={trackName || track.name} onChange={(e) => setTrackName(e.target.value)} />
                        <Input label={t('career.description')} value={trackDescription} onChange={(e) => setTrackDescription(e.target.value)} />
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => saveTrack.mutate({ name: trackName || track.name, description: trackDescription })}>{t('career.saveChanges')}</Button>
                        <Button variant="ghost" onClick={() => setTrackOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={Boolean(editingNode)} title={t('common.edit')} onClose={() => setEditingNode(null)}>
                {editingNode ? (
                    <div className={page.stack}>
                        <div className={page.grid}>
                            <Select label={t('form.position')} value={editingNode.positionId || ''} onChange={(e) => setEditingNode({ ...editingNode, positionId: e.target.value })}>
                                <option value="">{t('common.select')}</option>
                                {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </Select>
                            <Select label={t('form.grade')} value={editingNode.gradeId || ''} onChange={(e) => setEditingNode({ ...editingNode, gradeId: e.target.value })}>
                                <option value="">{t('common.select')}</option>
                                {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </Select>
                            <Input label={t('career.label')} value={editingNode.label || ''} onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })} />
                            <Input label={t('career.order')} type="number" value={editingNode.displayOrder || 0} onChange={(e) => setEditingNode({ ...editingNode, displayOrder: e.target.value })} />
                            <div className={page.spanAll}>
                                <Textarea label={t('career.nodeDescription')} value={editingNode.description || ''} onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })} />
                            </div>
                            <label>
                                <input type="checkbox" checked={Boolean(editingNode.isEntryPoint)} onChange={(e) => setEditingNode({ ...editingNode, isEntryPoint: e.target.checked })} />
                                {' '}{t('career.entryPoint')}
                            </label>
                        </div>
                        <div className={page.row}>
                            <Button onClick={() => saveNode.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEditingNode(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Modal open={nodeOpen} title={t('career.addNode')} onClose={() => setNodeOpen(false)}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <Select label={t('form.position')} value={node.positionId} onChange={(e) => setNode({ ...node, positionId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                        <Select label={t('form.grade')} value={node.gradeId} onChange={(e) => setNode({ ...node, gradeId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                        <Input label={t('career.label')} value={node.label} onChange={(e) => setNode({ ...node, label: e.target.value })} />
                        <Input label={t('career.order')} type="number" value={node.displayOrder} onChange={(e) => setNode({ ...node, displayOrder: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('career.nodeDescription')} value={node.description || ''} onChange={(e) => setNode({ ...node, description: e.target.value })} />
                        </div>
                        <label>
                            <input type="checkbox" checked={Boolean(node.isEntryPoint)} onChange={(e) => setNode({ ...node, isEntryPoint: e.target.checked })} />
                            {' '}{t('career.entryPoint')}
                        </label>
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => addNode.mutate()}>{t('career.addNode')}</Button>
                        <Button variant="ghost" onClick={() => setNodeOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={transitionOpen} title={t('career.addTransition')} onClose={() => setTransitionOpen(false)}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <Select label={t('career.fromNode')} value={transition.sourceNodeId} onChange={(e) => setTransition({ ...transition, sourceNodeId: e.target.value })}>
                            <option value="">{t('career.node')}</option>
                            {nodes.map((item) => <option key={item.id} value={item.id}>{nodeTitle(item)}</option>)}
                        </Select>
                        <Select label={t('career.toNode')} value={transition.targetNodeId} onChange={(e) => setTransition({ ...transition, targetNodeId: e.target.value })}>
                            <option value="">{t('career.node')}</option>
                            {nodes.map((item) => <option key={item.id} value={item.id}>{nodeTitle(item)}</option>)}
                        </Select>
                        <Select label={t('career.type')} value={transition.transitionType} onChange={(e) => setTransition({ ...transition, transitionType: e.target.value })}>
                            {['PROMOTION', 'ROTATION', 'TRANSFER'].map((type) => (
                                <option key={type} value={type}>{enumLabel(t, 'transitionType', type)}</option>
                            ))}
                        </Select>
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => addTransition.mutate()}>{t('career.addTransition')}</Button>
                        <Button variant="ghost" onClick={() => setTransitionOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
