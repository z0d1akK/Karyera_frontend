import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { canManageDevelopmentPlans, canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { ProgressBar } from '../../shared/ui/Progress/Progress.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import page from '../../shared/styles/page.module.css';

const ACTIVITY_TYPES = ['TRAINING', 'CERTIFICATION', 'PROJECT_PRACTICE', 'PRACTICAL_TASK', 'MENTORING', 'SELF_STUDY'];

export function DevelopmentPlanPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [activity, setActivity] = useState({ title: '', description: '', activityType: 'TRAINING', dueDate: '' });
    const [draft, setDraft] = useState(null);
    const [evidence, setEvidence] = useState({ activityId: '', evidenceType: 'LINK', externalUrl: '', description: '' });
    const [comment, setComment] = useState('');
    const [editingActivity, setEditingActivity] = useState(null);

    const query = useQuery({ queryKey: queryKeys.career.plan(id), queryFn: () => careerApi.getPlan(id) });
    const reviews = useQuery({ queryKey: ['career', 'reviews', id], queryFn: () => careerApi.listReviews(id) });
    const skills = useQuery({
        queryKey: queryKeys.catalogs.skills({ size: 100 }),
        queryFn: async () => unwrapPage(await employeeApi.listSkills({ page: 0, size: 100, sortBy: 'name' })).content,
    });
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.career.plan(id) });
        queryClient.invalidateQueries({ queryKey: ['career', 'reviews', id] });
    };
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const version = () => ({ comment, expectedVersion: query.data?.version });

    const add = useMutation({ mutationFn: () => careerApi.addActivity(id, activity), onSuccess: invalidate, onError });
    const submit = useMutation({ mutationFn: () => careerApi.submitPlan(id, version()), onSuccess: invalidate, onError });
    const approve = useMutation({ mutationFn: () => careerApi.approvePlan(id, { ...version(), decision: 'APPROVED' }), onSuccess: invalidate, onError });
    const requestChanges = useMutation({ mutationFn: () => careerApi.requestPlanChanges(id, { ...version(), decision: 'CHANGES_REQUESTED' }), onSuccess: invalidate, onError });
    const complete = useMutation({ mutationFn: () => careerApi.completePlan(id, version()), onSuccess: invalidate, onError });
    const cancel = useMutation({ mutationFn: () => careerApi.cancelPlan(id, version()), onSuccess: invalidate, onError });
    const saveDraft = useMutation({
        mutationFn: () => careerApi.updatePlan(id, draft),
        onSuccess: () => {
            setDraft(null);
            invalidate();
        },
        onError,
    });
    const submitActivity = useMutation({ mutationFn: (activityId) => careerApi.submitActivity(activityId, { expectedVersion: query.data?.version }), onSuccess: invalidate, onError });
    const verifyActivity = useMutation({ mutationFn: (activityId) => careerApi.verifyActivity(activityId, { comment, expectedVersion: query.data?.version }), onSuccess: invalidate, onError });
    const rejectActivity = useMutation({ mutationFn: (activityId) => careerApi.rejectActivity(activityId, { comment, expectedVersion: query.data?.version }), onSuccess: invalidate, onError });
    const saveActivity = useMutation({
        mutationFn: ({ id: activityId, ...payload }) => careerApi.updateActivity(
            activityId,
            Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '')),
        ),
        onSuccess: () => {
            setEditingActivity(null);
            invalidate();
        },
        onError,
    });
    const addEvidence = useMutation({
        mutationFn: () => careerApi.addEvidence(evidence.activityId, evidence),
        onSuccess: invalidate,
        onError,
    });

    if (query.isLoading) {
        return <Skeleton />;
    }

    const plan = query.data;
    const activities = plan.activities || [];
    const reviewList = Array.isArray(reviews.data) ? reviews.data : reviews.data?.content || [];
    const hr = canManageHr(role);
    const canManagePlan = canManageDevelopmentPlans(role);
    const draftStatus = plan.status === 'DRAFT' || plan.status === 'CHANGES_REQUESTED';

    return (
        <section>
            <BackLink to="/app/development">{t('development.back')}</BackLink>
            <PageHeader title={plan.title} actions={<Badge>{enumLabel(t, 'planStatus', plan.status)}</Badge>} />
            <Card>
                <div className={page.stack}>
                    <p>{plan.description}</p>
                    <ProgressBar value={plan.progressPercent ?? 0} label={t('development.progress')} />
                </div>
                {draft ? (
                    <div className={page.stack}>
                        <h3 className={page.sectionTitle}>{t('development.editDraft')}</h3>
                        <div className={page.grid}>
                        <Input label={t('development.name')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <Input type="date" label={t('development.deadline')} value={draft.targetDate || ''} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('development.description')} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                        </div>
                        </div>
                        <div className={page.row}>
                            <Button onClick={() => saveDraft.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
                    {canManagePlan ? (
                    <div className={page.stack}>
                    <Textarea label={t('talent.comment')} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <div className={page.row}>
                        {draftStatus ? <Button variant="secondary" onClick={() => setDraft({ title: plan.title, description: plan.description || '', targetDate: plan.targetDate || '', careerGoalId: plan.careerGoalId })}>{t('development.editDraft')}</Button> : null}
                        <Button onClick={() => submit.mutate()}>{t('development.submit')}</Button>
                        {hr ? <Button onClick={() => approve.mutate()}>{t('development.approve')}</Button> : null}
                        {hr ? <Button variant="ghost" onClick={() => requestChanges.mutate()}>{t('development.requestChanges')}</Button> : null}
                        <Button variant="secondary" onClick={() => complete.mutate()}>{t('development.complete')}</Button>
                        <Button variant="danger" onClick={() => cancel.mutate()}>{t('development.cancel')}</Button>
                    </div>
                    </div>
                    ) : null}
                <div className={page.stack}>
                    <h3 className={page.sectionTitle}>{t('development.activities')}</h3>
                    {activities.map((item) => (
                        <article key={item.id} className={page.stack}>
                            <p>{item.title} · {enumLabel(t, 'activityStatus', item.status)} · {enumLabel(t, 'activityType', item.activityType)}</p>
                            {editingActivity?.id === item.id && canManagePlan ? (
                                <div className={page.grid}>
                                    <Input label={t('development.name')} value={editingActivity.title || ''} onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })} />
                                    <Select label={t('development.activityType')} value={editingActivity.activityType || 'TRAINING'} onChange={(e) => setEditingActivity({ ...editingActivity, activityType: e.target.value })}>
                                        {ACTIVITY_TYPES.map((type) => (
                                            <option key={type} value={type}>{enumLabel(t, 'activityType', type)}</option>
                                        ))}
                                    </Select>
                                    <Select label={t('career.skill')} value={editingActivity.skillId || ''} onChange={(e) => setEditingActivity({ ...editingActivity, skillId: e.target.value })}>
                                        <option value="">{t('common.notSelected')}</option>
                                        {(skills.data || []).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                                    </Select>
                                    <Input type="date" label={t('development.deadline')} value={editingActivity.dueDate || ''} onChange={(e) => setEditingActivity({ ...editingActivity, dueDate: e.target.value })} />
                                    <div className={page.spanAll}>
                                        <Textarea label={t('development.description')} value={editingActivity.description || ''} onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })} />
                                    </div>
                                    <div className={page.row}>
                                        <Button onClick={() => saveActivity.mutate(editingActivity)}>{t('common.save')}</Button>
                                        <Button variant="ghost" onClick={() => setEditingActivity(null)}>{t('common.cancel')}</Button>
                                    </div>
                                </div>
                            ) : null}
                            <div className={page.row}>
                                <Button variant="ghost" onClick={() => submitActivity.mutate(item.id)}>{t('development.submitActivity')}</Button>
                                {hr ? <Button variant="ghost" onClick={() => verifyActivity.mutate(item.id)}>{t('development.verify')}</Button> : null}
                                {hr ? <Button variant="ghost" onClick={() => rejectActivity.mutate(item.id)}>{t('development.reject')}</Button> : null}
                                {canManagePlan ? (
                                <Button variant="secondary" onClick={() => setEditingActivity({
                                    id: item.id,
                                    title: item.title || '',
                                    description: item.description || '',
                                    activityType: item.activityType || 'TRAINING',
                                    dueDate: item.dueDate || '',
                                    skillId: item.skillId || '',
                                })}>{t('common.edit')}</Button>
                                ) : null}
                            </div>
                        </article>
                    ))}
                </div>
                {canManagePlan ? (
                <div className={page.stack}>
                    <h3 className={page.sectionTitle}>{t('development.addActivity')}</h3>
                    <div className={page.grid}>
                    <Input label={t('development.name')} value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} />
                    <Select label={t('development.activityType')} value={activity.activityType} onChange={(e) => setActivity({ ...activity, activityType: e.target.value })}>
                        {ACTIVITY_TYPES.map((type) => (
                            <option key={type} value={type}>{enumLabel(t, 'activityType', type)}</option>
                        ))}
                    </Select>
                    <Select label={t('career.skill')} value={activity.skillId || ''} onChange={(e) => setActivity({ ...activity, skillId: e.target.value })}>
                        <option value="">{t('common.notSelected')}</option>
                        {(skills.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <div className={page.spanAll}>
                        <Textarea label={t('development.description')} value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} />
                    </div>
                    <Input type="date" label={t('development.deadline')} value={activity.dueDate} onChange={(e) => setActivity({ ...activity, dueDate: e.target.value })} />
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => add.mutate()}>{t('development.addActivity')}</Button>
                    </div>
                </div>
                ) : null}
                <div className={page.stack}>
                    <h3 className={page.sectionTitle}>{t('development.evidence')}</h3>
                    <div className={page.grid}>
                        <Select label={t('development.activities')} value={evidence.activityId} onChange={(e) => setEvidence({ ...evidence, activityId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </Select>
                        <Input label={t('development.evidenceType')} value={evidence.evidenceType} onChange={(e) => setEvidence({ ...evidence, evidenceType: e.target.value })} />
                        <Input label={t('development.externalUrl')} value={evidence.externalUrl} onChange={(e) => setEvidence({ ...evidence, externalUrl: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('development.description')} value={evidence.description} onChange={(e) => setEvidence({ ...evidence, description: e.target.value })} />
                        </div>
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => addEvidence.mutate()} disabled={!evidence.activityId}>{t('common.add')}</Button>
                    </div>
                </div>
                <div className={page.stack}>
                    <h3 className={page.sectionTitle}>{t('development.reviews')}</h3>
                    {reviewList.map((item) => (
                        <p key={item.id}>{enumLabel(t, 'planStatus', item.decision)} · {item.comment}</p>
                    ))}
                </div>
            </Card>
        </section>
    );
}
