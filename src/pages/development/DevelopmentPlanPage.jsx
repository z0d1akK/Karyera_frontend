import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { formatDate, formatDateTime } from '../../shared/lib/format.js';
import { canManageDevelopmentPlans, canManageHr, canUpdateOwnDevelopment } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { ProgressBar } from '../../shared/ui/Progress/Progress.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { useEmployeeNames } from '../../shared/lib/displayNames.js';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import catalog from '../../shared/styles/catalog.module.css';
import styles from './DevelopmentPlanPage.module.css';

function evidenceHref(url) {
    if (!url) {
        return '';
    }
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const ACTIVITY_TYPES = ['TRAINING', 'CERTIFICATION', 'PROJECT_PRACTICE', 'PRACTICAL_TASK', 'MENTORING', 'SELF_STUDY'];

export function DevelopmentPlanPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const role = useAuthStore((s) => s.session?.role);
    const selfId = useAuthStore((s) => s.employee?.id);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const employeeName = useEmployeeNames();
    const [activity, setActivity] = useState({ title: '', description: '', activityType: 'TRAINING', dueDate: '' });
    const [draft, setDraft] = useState(null);
    const [evidence, setEvidence] = useState({ activityId: '', evidenceType: 'LINK', externalUrl: '', description: '' });
    const [comment, setComment] = useState('');
    const [editingActivity, setEditingActivity] = useState(null);
    const [activityOpen, setActivityOpen] = useState(false);
    const [evidenceOpen, setEvidenceOpen] = useState(false);

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

    const add = useMutation({
        mutationFn: () => careerApi.addActivity(id, activity),
        onSuccess: () => {
            setActivityOpen(false);
            invalidate();
        },
        onError,
    });
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
    const submitActivity = useMutation({
        mutationFn: (item) => careerApi.submitActivity(item.id, { expectedVersion: item.version }),
        onSuccess: invalidate,
        onError,
    });
    const verifyActivity = useMutation({
        mutationFn: (item) => careerApi.verifyActivity(item.id, { comment, expectedVersion: item.version }),
        onSuccess: invalidate,
        onError,
    });
    const rejectActivity = useMutation({
        mutationFn: (item) => careerApi.rejectActivity(item.id, { comment, expectedVersion: item.version }),
        onSuccess: invalidate,
        onError,
    });
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
        onSuccess: () => {
            setEvidenceOpen(false);
            invalidate();
        },
        onError,
    });

    if (query.isLoading) {
        return <Skeleton />;
    }

    if (query.isError || !query.data) {
        return <PageState title={t('development.loadFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />;
    }

    const plan = query.data;
    const activities = plan.activities || [];
    const reviewList = Array.isArray(reviews.data) ? reviews.data : reviews.data?.content || [];
    const hr = canManageHr(role);
    const canManagePlan = canManageDevelopmentPlans(role);
    const isOwner = Boolean(selfId && plan.employeeId && String(plan.employeeId) === String(selfId));
    const canReview = hr || (canManagePlan && !isOwner);
    const canOwnActions = canUpdateOwnDevelopment(role) && isOwner;
    const closed = plan.status === 'COMPLETED' || plan.status === 'CANCELLED';
    const draftLike = plan.status === 'DRAFT' || plan.status === 'CHANGES_REQUESTED';
    const submitted = plan.status === 'SUBMITTED';
    const active = plan.status === 'ACTIVE';
    const skillName = (skillId) => (skills.data || []).find((item) => String(item.id) === String(skillId))?.name;
    const showReviewComment = (submitted || active) && canReview && !closed;
    const showPlanActions = (canManagePlan || isOwner) && !closed;

    return (
        <section className={styles.layout}>
            <div>
                <BackLink to="/app/development">{t('development.back')}</BackLink>
                <PageHeader
                    title={plan.title}
                    description={employeeName(plan.employeeId) || undefined}
                    actions={(
                        <Badge tone={statusTone('planStatus', plan.status)}>
                            {enumLabel(t, 'planStatus', plan.status)}
                        </Badge>
                    )}
                />
            </div>
            <article className={`${catalog.card} ${catalog.compactCard}`}>
                <div className={styles.overview}>
                    <p className={catalog.description}>{plan.description || t('organization.noDescription')}</p>
                    <div className={styles.meta}>
                        <div className={catalog.field}>
                            <span className={catalog.label}>{t('development.employee')}</span>
                            <span className={catalog.value}>{employeeName(plan.employeeId) || '—'}</span>
                        </div>
                        <div className={catalog.field}>
                            <span className={catalog.label}>{t('development.start')}</span>
                            <span className={catalog.value}>{formatDate(plan.startDate)}</span>
                        </div>
                        <div className={catalog.field}>
                            <span className={catalog.label}>{t('development.deadline')}</span>
                            <span className={catalog.value}>{formatDate(plan.targetDate)}</span>
                        </div>
                    </div>
                    <ProgressBar value={plan.progressPercent ?? 0} label={t('development.progress')} />
                    {showReviewComment ? (
                        <div className={styles.comment}>
                            <Textarea
                                rows={3}
                                label={t('development.reviewComment')}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    ) : null}
                    {showPlanActions ? (
                        <div className={styles.planActions}>
                            {draftLike && canManagePlan ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => setDraft({
                                        title: plan.title,
                                        description: plan.description || '',
                                        targetDate: plan.targetDate || '',
                                        careerGoalId: plan.careerGoalId,
                                    })}
                                >
                                    {t('development.editDraft')}
                                </Button>
                            ) : null}
                            {draftLike && (canManagePlan || isOwner) ? (
                                <Button onClick={() => submit.mutate()}>{t('development.submit')}</Button>
                            ) : null}
                            {submitted && canReview ? <Button onClick={() => approve.mutate()}>{t('development.approve')}</Button> : null}
                            {submitted && canReview ? (
                                <Button variant="ghost" onClick={() => requestChanges.mutate()}>{t('development.requestChanges')}</Button>
                            ) : null}
                            {active && canReview ? (
                                <Button variant="secondary" onClick={() => complete.mutate()}>{t('development.complete')}</Button>
                            ) : null}
                            {canManagePlan || isOwner ? (
                                <Button className={styles.planActionsCancel} variant="danger" onClick={() => cancel.mutate()}>
                                    {t('development.cancel')}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </article>
            <div>
                <div className={catalog.toolbar}>
                    <h2 className={catalog.sectionTitle}>{t('development.activities')}</h2>
                    <div className={catalog.toolbarActions}>
                        {canManagePlan && draftLike ? (
                            <Button onClick={() => setActivityOpen(true)}>{t('development.addActivity')}</Button>
                        ) : null}
                        {canOwnActions && !closed ? (
                            <Button variant="secondary" onClick={() => setEvidenceOpen(true)}>{t('development.addEvidence')}</Button>
                        ) : null}
                    </div>
                </div>
                {!activities.length ? <p className={catalog.empty}>{t('development.noActivities')}</p> : null}
                <div className={page.stack}>
                    {activities.map((item) => {
                        const evidenceList = item.evidence || [];
                        const canEditActivity = canManagePlan && !closed && item.status !== 'COMPLETED';
                        const canSubmitItem = canOwnActions && active && ['PLANNED', 'IN_PROGRESS', 'REJECTED'].includes(item.status);
                        const canDecideItem = canReview && active && ['PLANNED', 'IN_PROGRESS', 'SUBMITTED'].includes(item.status);
                        return (
                            <article key={item.id} className={`${catalog.card} ${catalog.compactCard} ${styles.activity}`}>
                                <div className={catalog.cardHead}>
                                    <h2>{item.title}</h2>
                                    <div className={styles.badges}>
                                        <Badge tone={statusTone('activityStatus', item.status)}>
                                            {enumLabel(t, 'activityStatus', item.status)}
                                        </Badge>
                                    </div>
                                </div>
                                {item.description ? <p className={catalog.description}>{item.description}</p> : null}
                                <div className={catalog.row}>
                                    <span>{t('development.activityType')}</span>
                                    <strong>{enumLabel(t, 'activityType', item.activityType)}</strong>
                                </div>
                                {item.skillId ? (
                                    <div className={catalog.row}>
                                        <span>{t('career.skill')}</span>
                                        <strong>{skillName(item.skillId) || '—'}</strong>
                                    </div>
                                ) : null}
                                <div className={catalog.row}>
                                    <span>{t('development.deadline')}</span>
                                    <strong>{item.dueDate ? formatDate(item.dueDate) : '—'}</strong>
                                </div>
                                {evidenceList.length ? (
                                    <div className={styles.evidenceList}>
                                        {evidenceList.map((entry) => (
                                            <div key={entry.id} className={styles.evidenceItem}>
                                                <div className={styles.evidenceMeta}>
                                                    <strong>{enumLabel(t, 'evidenceType', entry.evidenceType)}</strong>
                                                    {entry.externalUrl ? (
                                                        <a href={evidenceHref(entry.externalUrl)} target="_blank" rel="noreferrer">
                                                            {entry.externalUrl}
                                                        </a>
                                                    ) : null}
                                                    {entry.description ? <span className={catalog.description}>{entry.description}</span> : null}
                                                </div>
                                                <Badge tone={statusTone('evidenceVerification', entry.verificationStatus)}>
                                                    {enumLabel(t, 'evidenceVerification', entry.verificationStatus)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                {canSubmitItem || canDecideItem || canEditActivity ? (
                                    <div className={catalog.actions}>
                                        {canSubmitItem ? (
                                            <Button variant="ghost" onClick={() => submitActivity.mutate(item)}>
                                                {t('development.submitActivity')}
                                            </Button>
                                        ) : null}
                                        {canDecideItem ? (
                                            <Button onClick={() => verifyActivity.mutate(item)}>
                                                {t('development.verify')}
                                            </Button>
                                        ) : null}
                                        {canDecideItem ? (
                                            <Button variant="danger" onClick={() => rejectActivity.mutate(item)}>
                                                {t('development.reject')}
                                            </Button>
                                        ) : null}
                                        {canEditActivity ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => setEditingActivity({
                                                    id: item.id,
                                                    title: item.title || '',
                                                    description: item.description || '',
                                                    activityType: item.activityType || 'TRAINING',
                                                    dueDate: item.dueDate || '',
                                                    skillId: item.skillId || '',
                                                })}
                                            >
                                                {t('common.edit')}
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
            </div>
            <article className={`${catalog.card} ${catalog.compactCard}`}>
                <h2 className={catalog.sectionTitle}>{t('development.reviews')}</h2>
                {!reviewList.length ? <p className={catalog.empty}>{t('development.noReviews')}</p> : null}
                <div className={styles.reviews}>
                    {reviewList.map((item) => (
                        <div key={item.id} className={styles.reviewItem}>
                            <div className={styles.reviewHead}>
                                <Badge tone={statusTone('planReviewDecision', item.decision)}>
                                    {enumLabel(t, 'planReviewDecision', item.decision)}
                                </Badge>
                                <span className={catalog.empty}>
                                    {[employeeName(item.reviewerEmployeeId), formatDateTime(item.reviewedAt)].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                            <p className={catalog.description}>{item.comment || '—'}</p>
                        </div>
                    ))}
                </div>
            </article>
            <Modal open={Boolean(draft)} title={t('development.editDraft')} onClose={() => setDraft(null)}>
                {draft ? (
                    <div className={page.stack}>
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
            </Modal>
            <Modal open={activityOpen} title={t('development.addActivity')} onClose={() => setActivityOpen(false)}>
                <div className={page.stack}>
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
                        <Input type="date" label={t('development.deadline')} value={activity.dueDate} onChange={(e) => setActivity({ ...activity, dueDate: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('development.description')} value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} />
                        </div>
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => add.mutate()}>{t('development.addActivity')}</Button>
                        <Button variant="ghost" onClick={() => setActivityOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={Boolean(editingActivity)} title={t('common.edit')} onClose={() => setEditingActivity(null)}>
                {editingActivity ? (
                    <div className={page.stack}>
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
                        </div>
                        <div className={page.row}>
                            <Button onClick={() => saveActivity.mutate(editingActivity)}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEditingActivity(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Modal open={evidenceOpen} title={t('development.evidence')} onClose={() => setEvidenceOpen(false)}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <Select label={t('development.activities')} value={evidence.activityId} onChange={(e) => setEvidence({ ...evidence, activityId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </Select>
                        <Select label={t('development.evidenceType')} value={evidence.evidenceType} onChange={(e) => setEvidence({ ...evidence, evidenceType: e.target.value })}>
                            {['LINK', 'FILE', 'PROJECT_TASK'].map((type) => (
                                <option key={type} value={type}>{enumLabel(t, 'evidenceType', type)}</option>
                            ))}
                        </Select>
                        <Input label={t('development.externalUrl')} value={evidence.externalUrl} onChange={(e) => setEvidence({ ...evidence, externalUrl: e.target.value })} />
                        <div className={page.spanAll}>
                            <Textarea label={t('development.description')} value={evidence.description} onChange={(e) => setEvidence({ ...evidence, description: e.target.value })} />
                        </div>
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => addEvidence.mutate()} disabled={!evidence.activityId}>{t('common.add')}</Button>
                        <Button variant="ghost" onClick={() => setEvidenceOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
