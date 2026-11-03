import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectApi } from '../../features/projects/api/projectApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDateTime } from '../../shared/lib/format.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { isProjectEditor } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Tabs } from '../../shared/ui/Tabs/Tabs.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { CollapsePanel } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';

const listOf = (data) => (Array.isArray(data) ? data : data?.content || []);

export function TaskDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const employee = useAuthStore((s) => s.employee);
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [tab, setTab] = useState('details');
    const [comment, setComment] = useState('');
    const [edit, setEdit] = useState(null);
    const [relation, setRelation] = useState({ targetTaskId: '', relationType: 'BLOCKS' });
    const [skillId, setSkillId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');

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
        queryFn: async () => unwrapPage(await projectApi.listTasks(task.data.projectId, { page: 0, size: 50, sortBy: 'taskNumber' })),
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
            setComment('');
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(id) });
        },
        onError,
    });
    const save = useMutation({
        mutationFn: () => projectApi.updateTask(id, edit),
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
    const setParent = useMutation({
        mutationFn: (parentTaskId) => projectApi.updateParent(id, { parentTaskId: parentTaskId || null, expectedVersion: task.data.version }),
        onSuccess: refresh,
        onError,
    });
    const saveAssignees = useMutation({
        mutationFn: (ids) => projectApi.setAssignees(id, { assigneeIds: ids, expectedVersion: task.data.version }),
        onSuccess: refresh,
        onError,
    });
    const addRelation = useMutation({
        mutationFn: () => projectApi.addRelation(id, relation),
        onSuccess: refresh,
        onError,
    });
    const removeRelation = useMutation({
        mutationFn: (relationId) => projectApi.deleteRelation(relationId),
        onSuccess: refresh,
        onError,
    });
    const addSkill = useMutation({
        mutationFn: () => projectApi.addTaskSkill(id, { skillId }),
        onSuccess: refresh,
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
    const myAssignment = assignmentList.find((item) => item.employeeId === employee?.id);
    const canEdit = isProjectEditor(role, project.data, employee?.id)
        || assigneeList.some((item) => item.assignmentId === myAssignment?.id);

    return (
        <section>
            <BackLink to={`/app/projects/${data.projectId}`}>{t('projects.backToProject')}</BackLink>
            <PageHeader title={data.title} description={data.key} actions={<Badge>{data.status || enumLabel(t, 'priority', data.priority)}</Badge>} />
            <Tabs
                items={[
                    { id: 'details', label: t('projects.tabDetails') },
                    { id: 'people', label: t('projects.assignees') },
                    { id: 'comments', label: t('projects.tabComments') },
                    { id: 'history', label: t('projects.tabHistory') },
                ]}
                value={tab}
                onChange={setTab}
            />
            <Card>
                {tab === 'details' && (
                    <div className={page.stack}>
                        <p>{data.description}</p>
                        <p>{t('projects.priority')}: {enumLabel(t, 'priority', data.priority)}</p>
                        <p>{t('navigation.projects')}: <Link to={`/app/projects/${data.projectId}`}>{project.data?.name || data.projectId}</Link></p>
                        <p>{t('projects.parent')}: {data.parentTaskId || '—'}</p>
                        <div>
                            <h3>{t('projects.subtasks')}</h3>
                            {childList.map((item) => <p key={item.id}><Link to={`/app/tasks/${item.id}`}>{item.title}</Link></p>)}
                        </div>
                        <div>
                            <h3>{t('projects.relations')}</h3>
                            {relationList.map((item) => (
                                <p key={item.id}>
                                    {enumLabel(t, 'relationType', item.relationType)} · {item.targetTaskId}
                                    {canEdit ? <Button variant="ghost" onClick={() => removeRelation.mutate(item.id)}>{t('common.delete')}</Button> : null}
                                </p>
                            ))}
                            {canEdit ? (
                                <div className={page.row}>
                                    <Select value={relation.targetTaskId} onChange={(e) => setRelation({ ...relation, targetTaskId: e.target.value })}>
                                        <option value="">{t('common.select')}</option>
                                        {(siblings.data?.content || []).filter((item) => item.id !== id).map((item) => (
                                            <option key={item.id} value={item.id}>{item.title}</option>
                                        ))}
                                    </Select>
                                    <Select value={relation.relationType} onChange={(e) => setRelation({ ...relation, relationType: e.target.value })}>
                                        {['BLOCKS', 'RELATES_TO', 'DUPLICATES'].map((item) => <option key={item} value={item}>{enumLabel(t, 'relationType', item)}</option>)}
                                    </Select>
                                    <Button onClick={() => addRelation.mutate()} disabled={!relation.targetTaskId}>{t('common.add')}</Button>
                                </div>
                            ) : null}
                        </div>
                        <div>
                            <h3>{t('projects.taskSkills')}</h3>
                            {skillList.map((item) => (
                                <p key={item.id}>
                                    {(catalogSkills.data || []).find((skill) => skill.id === item.skillId)?.name || item.skillId}
                                    {canEdit ? <Button variant="ghost" onClick={() => removeSkill.mutate(item.id)}>{t('common.delete')}</Button> : null}
                                </p>
                            ))}
                            {canEdit ? (
                                <CollapsePanel label={t('common.add')}>
                                    <div className={page.row}>
                                    <Select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                                        <option value="">{t('common.select')}</option>
                                        {(catalogSkills.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </Select>
                                    <Button onClick={() => addSkill.mutate()} disabled={!skillId}>{t('common.add')}</Button>
                                    </div>
                                </CollapsePanel>
                            ) : null}
                        </div>
                        {canEdit ? (
                            edit ? (
                                <CollapsePanel label={t('common.edit')} open onOpenChange={(next) => { if (!next) setEdit(null); }}>
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
                                    <div className={page.row}>
                                        <Button onClick={() => save.mutate()}>{t('projects.saveTask')}</Button>
                                        <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                                    </div>
                                </CollapsePanel>
                            ) : (
                                <div className={page.row}>
                                    <Button onClick={() => setEdit({
                                        title: data.title,
                                        description: data.description || '',
                                        priority: data.priority,
                                        complexity: data.complexity || '',
                                        storyPoints: data.storyPoints || '',
                                        dueDate: data.dueDate || '',
                                        taskTypeId: data.taskTypeId,
                                        columnId: data.columnId,
                                    })}>{t('common.edit')}</Button>
                                    <Select value={data.parentTaskId || ''} onChange={(e) => setParent.mutate(e.target.value)}>
                                        <option value="">{t('projects.parent')}</option>
                                        {(siblings.data?.content || []).filter((item) => item.id !== id).map((item) => (
                                            <option key={item.id} value={item.id}>{item.title}</option>
                                        ))}
                                    </Select>
                                    <Button variant="danger" onClick={() => archive.mutate()}>{t('projects.archiveTask')}</Button>
                                </div>
                            )
                        ) : null}
                    </div>
                )}
                {tab === 'people' && (
                    <div className={page.stack}>
                        {assigneeList.map((item) => {
                            const assignment = assignmentList.find((row) => row.id === item.assignmentId);
                            return <p key={item.id}>{assignment?.employeeFullName || assignment?.employeeId || item.assignmentId}</p>;
                        })}
                        {canEdit ? (
                            <CollapsePanel label={t('common.add')}>
                            <div className={page.row}>
                                <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                                    <option value="">{t('common.select')}</option>
                                    {assignmentList.map((item) => (
                                        <option key={item.id} value={item.id}>{item.employeeFullName || item.employeeId}</option>
                                    ))}
                                </Select>
                                <Button
                                    onClick={() => saveAssignees.mutate([...new Set([...assigneeList.map((item) => item.assignmentId), assigneeId].filter(Boolean))])}
                                    disabled={!assigneeId}
                                >
                                    {t('common.add')}
                                </Button>
                            </div>
                            </CollapsePanel>
                        ) : null}
                    </div>
                )}
                {tab === 'comments' && (
                    <div className={page.stack}>
                        {commentList.map((item) => (
                            <p key={item.id}>{item.content} · {formatDateTime(item.createdAt)}</p>
                        ))}
                        <CollapsePanel label={t('projects.addComment')}>
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                        <Button onClick={() => addComment.mutate()} disabled={!employee?.id}>{t('projects.addComment')}</Button>
                        </CollapsePanel>
                    </div>
                )}
                {tab === 'history' && (
                    <div className={page.stack}>
                        {activityList.map((item) => (
                            <p key={item.id}>{item.action || item.type || item.fieldName} · {formatDateTime(item.createdAt)}</p>
                        ))}
                    </div>
                )}
            </Card>
        </section>
    );
}
