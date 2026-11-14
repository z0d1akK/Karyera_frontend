import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectApi } from '../../features/projects/api/projectApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate, formatDateTime } from '../../shared/lib/format.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { useEmployeeNames } from '../../shared/lib/displayNames.js';
import { getApiError } from '../../shared/api/errors.js';
import { isAssignedToProject, isProjectEditor } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Tabs } from '../../shared/ui/Tabs/Tabs.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { NamedLink } from '../../shared/ui/NamedLink/NamedLink.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';

const listOf = (data) => (Array.isArray(data) ? data : data?.content || []);

function Field({ label, value }) {
    return (
        <div className={styles.field}>
            <span className={styles.label}>{label}</span>
            <div className={styles.value}>{value || '—'}</div>
        </div>
    );
}

function relatedTaskId(item, currentId) {
    if (item.targetTaskId && String(item.targetTaskId) !== String(currentId)) {
        return item.targetTaskId;
    }
    return item.sourceTaskId || item.targetTaskId;
}

export function TaskDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const employee = useAuthStore((s) => s.employee);
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const employeeName = useEmployeeNames();
    const [tab, setTab] = useState('details');
    const [comment, setComment] = useState('');
    const [edit, setEdit] = useState(null);
    const [relation, setRelation] = useState({ targetTaskId: '', relationType: 'BLOCKS' });
    const [skillId, setSkillId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [skillOpen, setSkillOpen] = useState(false);
    const [assigneeOpen, setAssigneeOpen] = useState(false);
    const [commentOpen, setCommentOpen] = useState(false);
    const [relationOpen, setRelationOpen] = useState(false);

    const task = useQuery({ queryKey: queryKeys.tasks.one(id), queryFn: () => projectApi.getTask(id) });
    const comments = useQuery({ queryKey: queryKeys.tasks.comments(id), queryFn: () => projectApi.getComments(id) });
    const activities = useQuery({ queryKey: queryKeys.tasks.activities(id), queryFn: () => projectApi.getActivities(id) });
    const children = useQuery({ queryKey: queryKeys.tasks.children(id), queryFn: () => projectApi.getChildren(id) });
    const assignees = useQuery({ queryKey: ['tasks', id, 'assignees'], queryFn: () => projectApi.getAssignees(id) });
    const relations = useQuery({ queryKey: ['tasks', id, 'relations'], queryFn: () => projectApi.getRelations(id) });
    const skills = useQuery({ queryKey: ['tasks', id, 'skills'], queryFn: () => projectApi.getTaskSkills(id) });
    const catalogSkills = useQuery({
        queryKey: queryKeys.catalogs.skills({ size: 100 }),
        queryFn: async () => unwrapPage(await employeeApi.listSkills({ page: 0, size: 100, sortBy: 'name' })).content,
    });
    const project = useQuery({
        queryKey: queryKeys.projects.one(task.data?.projectId),
        enabled: Boolean(task.data?.projectId),
        queryFn: () => projectApi.getById(task.data.projectId),
    });
    const assignments = useQuery({
        queryKey: queryKeys.projects.assignments(task.data?.projectId),
        enabled: Boolean(task.data?.projectId),
        queryFn: async () => unwrapPage(await projectApi.listAssignments(task.data.projectId, { page: 0, size: 50 })),
    });
    const siblings = useQuery({
        queryKey: queryKeys.projects.tasks(task.data?.projectId, { picker: true }),
        enabled: Boolean(task.data?.projectId),
        queryFn: async () => unwrapPage(await projectApi.listTasks(task.data.projectId, { page: 0, size: 100, sortBy: 'taskNumber' })),
    });
    const parentTask = useQuery({
        queryKey: queryKeys.tasks.one(task.data?.parentTaskId),
        enabled: Boolean(task.data?.parentTaskId),
        queryFn: () => projectApi.getTask(task.data.parentTaskId),
    });
    const taskTime = useQuery({
        queryKey: ['tasks', id, 'time'],
        queryFn: async () => unwrapPage(await timeApi.listEntries({
            taskId: id,
            page: 0,
            size: 50,
            sortBy: 'workDate',
            sortDirection: 'DESC',
        })),
    });

    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.one(id) });
        queryClient.invalidateQueries({ queryKey: ['tasks', id, 'assignees'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', id, 'relations'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', id, 'skills'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.children(id) });
    };

    const addComment = useMutation({
        mutationFn: () => projectApi.addComment(id, { authorEmployeeId: employee.id, content: comment }),
        onSuccess: () => {
            setCommentOpen(false);
            setComment('');
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(id) });
        },
        onError,
    });
    const save = useMutation({
        mutationFn: async () => {
            const { parentTaskId, ...payload } = edit;
            const saved = await projectApi.updateTask(id, payload);
            const currentParent = task.data.parentTaskId || '';
            if ((parentTaskId || '') !== currentParent) {
                await projectApi.updateParent(id, {
                    parentTaskId: parentTaskId || null,
                    expectedVersion: saved?.version ?? task.data.version,
                });
            }
        },
        onSuccess: () => {
            setEdit(null);
            refresh();
        },
        onError,
    });
    const archive = useMutation({
        mutationFn: () => projectApi.archiveTask(id),
        onSuccess: () => navigate(`/app/projects/${task.data.projectId}`),
        onError,
    });
    const saveAssignees = useMutation({
        mutationFn: (ids) => projectApi.setAssignees(id, { assigneeIds: ids, expectedVersion: task.data.version }),
        onSuccess: () => {
            setAssigneeOpen(false);
            setAssigneeId('');
            refresh();
        },
        onError,
    });
    const addRelation = useMutation({
        mutationFn: () => projectApi.addRelation(id, relation),
        onSuccess: () => {
            setRelationOpen(false);
            setRelation({ targetTaskId: '', relationType: 'BLOCKS' });
            refresh();
        },
        onError,
    });
    const removeRelation = useMutation({
        mutationFn: (relationId) => projectApi.deleteRelation(relationId),
        onSuccess: refresh,
        onError,
    });
    const addSkill = useMutation({
        mutationFn: () => projectApi.addTaskSkill(id, { skillId }),
        onSuccess: () => {
            setSkillOpen(false);
            setSkillId('');
            refresh();
        },
        onError,
    });
    const removeSkill = useMutation({
        mutationFn: (taskSkillId) => projectApi.deleteTaskSkill(taskSkillId),
        onSuccess: refresh,
        onError,
    });

    if (task.isLoading) {
        return <Skeleton />;
    }

    const data = task.data;
    const commentList = listOf(comments.data);
    const activityList = listOf(activities.data);
    const childList = listOf(children.data);
    const assigneeList = listOf(assignees.data);
    const relationList = listOf(relations.data);
    const skillList = listOf(skills.data);
    const assignmentList = assignments.data?.content || [];
    const siblingTasks = siblings.data?.content || [];
    const timeRows = taskTime.data?.content || [];
    const loggedMinutes = timeRows.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0);
    const myAssignment = assignmentList.find((item) => item.employeeId === employee?.id);
    const canEdit = isProjectEditor(role, project.data, employee?.id, {
        assigned: isAssignedToProject(assignmentList, employee?.id),
    })
        || assigneeList.some((item) => item.assignmentId === myAssignment?.id);

    const taskName = (taskId) => {
        if (!taskId) {
            return null;
        }
        if (String(taskId) === String(id)) {
            return data.title;
        }
        if (String(taskId) === String(data.parentTaskId) && parentTask.data?.title) {
            return parentTask.data.title;
        }
        const found = siblingTasks.find((item) => String(item.id) === String(taskId))
            || childList.find((item) => String(item.id) === String(taskId));
        return found?.title || found?.key || null;
    };

    const openEdit = () => setEdit({
        title: data.title,
        description: data.description || '',
        priority: data.priority,
        complexity: data.complexity || '',
        storyPoints: data.storyPoints || '',
        dueDate: data.dueDate || '',
        taskTypeId: data.taskTypeId,
        columnId: data.columnId,
        parentTaskId: data.parentTaskId || '',
    });

    const tabActions = () => {
        if (tab === 'people' && canEdit) {
            return <Button onClick={() => setAssigneeOpen(true)}>{t('common.add')}</Button>;
        }
        if (tab === 'comments') {
            return <Button onClick={() => setCommentOpen(true)}>{t('projects.addComment')}</Button>;
        }
        return null;
    };

    return (
        <section>
            <BackLink to={`/app/projects/${data.projectId}`}>{t('projects.backToProject')}</BackLink>
            <PageHeader
                title={data.title}
                description={data.key}
                actions={<Badge>{data.status || enumLabel(t, 'priority', data.priority)}</Badge>}
            />
            <Tabs
                items={[
                    { id: 'details', label: t('projects.tabDetails') },
                    { id: 'people', label: t('projects.assignees') },
                    { id: 'comments', label: t('projects.tabComments') },
                    { id: 'history', label: t('projects.tabHistory') },
                ]}
                value={tab}
                onChange={setTab}
                actions={tabActions()}
            />
            {tab === 'details' && (
                <div className={styles.stack}>
                    <article className={styles.panel}>
                        {data.description ? <p className={styles.description}>{data.description}</p> : null}
                        <div className={styles.detailFields}>
                            <Field label={t('projects.priority')} value={enumLabel(t, 'priority', data.priority)} />
                            <Field
                                label={t('time.project')}
                                value={<NamedLink to={`/app/projects/${data.projectId}`} name={project.data?.name} />}
                            />
                            <Field
                                label={t('projects.parent')}
                                value={<NamedLink to={data.parentTaskId ? `/app/tasks/${data.parentTaskId}` : null} name={taskName(data.parentTaskId)} />}
                            />
                            <Field label={t('projects.dueDate')} value={data.dueDate ? formatDate(data.dueDate) : null} />
                            <Field label={t('projects.complexity')} value={data.complexity ? enumLabel(t, 'complexity', data.complexity) || data.complexity : null} />
                            <Field label={t('projects.storyPoints')} value={data.storyPoints} />
                            <Field label={t('time.hours')} value={loggedMinutes ? hoursLabel(loggedMinutes) : '0'} />
                        </div>
                        {canEdit ? (
                            <div className={styles.actions}>
                                <Button onClick={openEdit}>{t('common.edit')}</Button>
                                {data.status !== 'ARCHIVED' ? <Button variant="danger" onClick={() => archive.mutate()}>{t('projects.archiveTask')}</Button> : null}
                            </div>
                        ) : null}
                    </article>
                    <article className={styles.panel}>
                        <div className={styles.cardHead}>
                            <h2>{t('projects.subtasks')}</h2>
                        </div>
                        {childList.length ? childList.map((item) => (
                            <div key={item.id} className={styles.itemRow}>
                                <NamedLink to={`/app/tasks/${item.id}`} name={item.title} />
                                {item.status ? <Badge>{item.status}</Badge> : null}
                            </div>
                        )) : <p className={styles.empty}>{t('projects.emptySubtasks')}</p>}
                    </article>
                    <article className={styles.panel}>
                        <div className={styles.cardHead}>
                            <h2>{t('projects.relations')}</h2>
                            {canEdit ? <Button onClick={() => setRelationOpen(true)}>{t('common.add')}</Button> : null}
                        </div>
                        {relationList.length ? relationList.map((item) => {
                            const peerId = relatedTaskId(item, id);
                            return (
                                <div key={item.id} className={styles.itemRow}>
                                    <span className={styles.itemMeta}>{enumLabel(t, 'relationType', item.relationType)}</span>
                                    <NamedLink to={peerId ? `/app/tasks/${peerId}` : null} name={taskName(peerId)} />
                                    {canEdit ? <Button variant="ghost" onClick={() => removeRelation.mutate(item.id)}>{t('common.delete')}</Button> : null}
                                </div>
                            );
                        }) : <p className={styles.empty}>{t('projects.emptyRelations')}</p>}
                    </article>
                    <article className={styles.panel}>
                        <div className={styles.cardHead}>
                            <h2>{t('projects.taskSkills')}</h2>
                            {canEdit ? <Button onClick={() => setSkillOpen(true)}>{t('common.add')}</Button> : null}
                        </div>
                        {skillList.length ? skillList.map((item) => (
                            <div key={item.id} className={styles.itemRow}>
                                <span>{(catalogSkills.data || []).find((skill) => skill.id === item.skillId)?.name || '—'}</span>
                                {canEdit ? <Button variant="ghost" onClick={() => removeSkill.mutate(item.id)}>{t('common.delete')}</Button> : null}
                            </div>
                        )) : <p className={styles.empty}>{t('projects.emptyTaskSkills')}</p>}
                    </article>
                </div>
            )}
            {tab === 'people' && (
                <article className={styles.panel}>
                    {assigneeList.length ? assigneeList.map((item) => {
                        const assignment = assignmentList.find((row) => row.id === item.assignmentId);
                        return <p key={item.id} className={styles.itemRow}>{assignment?.employeeFullName || employeeName(assignment?.employeeId) || '—'}</p>;
                    }) : <p className={styles.empty}>{t('projects.emptyAssignees')}</p>}
                </article>
            )}
            {tab === 'comments' && (
                <article className={styles.panel}>
                    {commentList.length ? commentList.map((item) => (
                        <div key={item.id} className={styles.itemRow}>
                            <span>{item.content}</span>
                            <span className={styles.itemMeta}>{formatDateTime(item.createdAt)}</span>
                        </div>
                    )) : <p className={styles.empty}>{t('projects.emptyComments')}</p>}
                </article>
            )}
            {tab === 'history' && (
                <article className={styles.panel}>
                    {activityList.length ? activityList.map((item) => (
                        <div key={item.id} className={styles.itemRow}>
                            <span>{item.action || item.type || item.fieldName}</span>
                            <span className={styles.itemMeta}>{formatDateTime(item.createdAt)}</span>
                        </div>
                    )) : <p className={styles.empty}>{t('projects.emptyHistory')}</p>}
                </article>
            )}
            <Modal open={relationOpen} title={t('projects.relations')} onClose={() => setRelationOpen(false)}>
                <div className={page.stack}>
                    <Select label={t('projects.tasks')} value={relation.targetTaskId} onChange={(e) => setRelation({ ...relation, targetTaskId: e.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {siblingTasks.filter((item) => item.id !== id).map((item) => (
                            <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                    </Select>
                    <Select label={t('projects.type')} value={relation.relationType} onChange={(e) => setRelation({ ...relation, relationType: e.target.value })}>
                        {['BLOCKS', 'RELATES_TO', 'DUPLICATES'].map((item) => <option key={item} value={item}>{enumLabel(t, 'relationType', item)}</option>)}
                    </Select>
                    <div className={page.row}>
                        <Button onClick={() => addRelation.mutate()} disabled={!relation.targetTaskId}>{t('common.add')}</Button>
                        <Button variant="ghost" onClick={() => setRelationOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={skillOpen} title={t('projects.taskSkills')} onClose={() => setSkillOpen(false)}>
                <div className={page.stack}>
                    <Select label={t('projects.taskSkills')} value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                        <option value="">{t('common.select')}</option>
                        {(catalogSkills.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <div className={page.row}>
                        <Button onClick={() => addSkill.mutate()} disabled={!skillId}>{t('common.add')}</Button>
                        <Button variant="ghost" onClick={() => setSkillOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={Boolean(edit)} title={t('common.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <div className={page.stack}>
                        <Input label={t('projects.name')} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                        <Textarea label={t('projects.description')} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                        <Select label={t('projects.priority')} value={edit.priority || 'MEDIUM'} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option key={item} value={item}>{enumLabel(t, 'priority', item)}</option>)}
                        </Select>
                        <Select label={t('projects.complexity')} value={edit.complexity || ''} onChange={(e) => setEdit({ ...edit, complexity: e.target.value })}>
                            <option value="">{t('common.notSelected')}</option>
                            {['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].map((item) => <option key={item} value={item}>{item}</option>)}
                        </Select>
                        <Input label={t('projects.storyPoints')} value={edit.storyPoints || ''} onChange={(e) => setEdit({ ...edit, storyPoints: e.target.value })} />
                        <Input type="date" label={t('projects.dueDate')} value={edit.dueDate || ''} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} />
                        <Select label={t('projects.parent')} value={edit.parentTaskId || ''} onChange={(e) => setEdit({ ...edit, parentTaskId: e.target.value })}>
                            <option value="">{t('common.notSelected')}</option>
                            {siblingTasks.filter((item) => item.id !== id).map((item) => (
                                <option key={item.id} value={item.id}>{item.title}</option>
                            ))}
                        </Select>
                        <div className={page.row}>
                            <Button onClick={() => save.mutate()}>{t('projects.saveTask')}</Button>
                            <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Modal open={assigneeOpen} title={t('projects.assignees')} onClose={() => setAssigneeOpen(false)}>
                <div className={page.stack}>
                    <Select label={t('projects.employee')} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">{t('common.select')}</option>
                        {assignmentList.map((item) => (
                            <option key={item.id} value={item.id}>{item.employeeFullName || employeeName(item.employeeId) || '—'}</option>
                        ))}
                    </Select>
                    <div className={page.row}>
                        <Button
                            onClick={() => saveAssignees.mutate([...new Set([...assigneeList.map((item) => item.assignmentId), assigneeId].filter(Boolean))])}
                            disabled={!assigneeId}
                        >
                            {t('common.add')}
                        </Button>
                        <Button variant="ghost" onClick={() => setAssigneeOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={commentOpen} title={t('projects.addComment')} onClose={() => setCommentOpen(false)}>
                <div className={page.stack}>
                    <Textarea label={t('projects.tabComments')} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <div className={page.row}>
                        <Button onClick={() => addComment.mutate()} disabled={!employee?.id || !comment}>{t('projects.addComment')}</Button>
                        <Button variant="ghost" onClick={() => setCommentOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
