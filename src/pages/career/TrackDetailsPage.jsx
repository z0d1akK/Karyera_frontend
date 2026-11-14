import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import styles from './TrackGraph.module.css';

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
    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.career.track(id) });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });

    const addNode = useMutation({
        mutationFn: () => careerApi.addNode(id, { ...node, displayOrder: Number(node.displayOrder), isEntryPoint: Boolean(node.isEntryPoint) }),
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
            label: editingNode.label,
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

    const track = query.data;
    const nodes = [...(track.nodes || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return (
        <section>
            <BackLink to="/app/career/tracks">{t('career.backToTracks')}</BackLink>
            <PageHeader title={track.name} description={track.code} actions={<Badge>{enumLabel(t, 'trackStatus', track.status)}</Badge>} />
            <Card>
                <div className={styles.graph}>
                    {nodes.map((item, index) => (
                        <div key={item.id} className={styles.node}>
                            <strong>{item.label || item.id}</strong>
                            <p>{item.description}</p>
                            {item.positionId ? <Link to={`/app/career/positions/${item.positionId}`}>{t('career.positionRequirements')}</Link> : null}
                            {canManageHr(role) && track.status === 'DRAFT' ? (
                                <div className={page.row}>
                                    <Button variant="ghost" onClick={() => setEditingNode(item)}>{t('common.edit')}</Button>
                                    <Button variant="danger" onClick={() => removeNode.mutate(item.id)}>{t('career.deleteNode')}</Button>
                                </div>
                            ) : null}
                            {index < nodes.length - 1 ? <div className={styles.arrow}>↓</div> : null}
                        </div>
                    ))}
                    {(track.transitions || []).map((item) => {
                        const source = nodes.find((node) => node.id === item.sourceNodeId);
                        const target = nodes.find((node) => node.id === item.targetNodeId);
                        return (
                        <p key={item.id} className={page.meta}>
                            {enumLabel(t, 'transitionType', item.transitionType)}: {source?.label || '—'} → {target?.label || '—'}
                            {canManageHr(role) && track.status === 'DRAFT' ? <Button variant="ghost" onClick={() => removeTransition.mutate(item.id)}>{t('career.deleteTransition')}</Button> : null}
                        </p>
                        );
                    })}
                </div>
            </Card>
            {canManageHr(role) ? (
                <div className={page.row}>
                    <Button variant="secondary" onClick={() => { setTrackName(track.name); setTrackDescription(track.description || ''); setTrackOpen(true); }}>{t('career.editTrack')}</Button>
                    {track.status === 'DRAFT' ? <Button onClick={() => setNodeOpen(true)}>{t('career.addNode')}</Button> : null}
                    {track.status === 'DRAFT' ? <Button onClick={() => setTransitionOpen(true)}>{t('career.addTransition')}</Button> : null}
                    {track.status === 'DRAFT' ? <Button onClick={() => publish.mutate()}>{t('career.publish')}</Button> : null}
                    {track.status === 'PUBLISHED' ? <Button variant="ghost" onClick={() => archive.mutate()}>{t('career.archive')}</Button> : null}
                </div>
            ) : null}
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
                            {nodes.map((item) => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}
                        </Select>
                        <Select label={t('career.toNode')} value={transition.targetNodeId} onChange={(e) => setTransition({ ...transition, targetNodeId: e.target.value })}>
                            <option value="">{t('career.node')}</option>
                            {nodes.map((item) => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}
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
