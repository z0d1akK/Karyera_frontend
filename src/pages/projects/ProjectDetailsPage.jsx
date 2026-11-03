import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectApi } from '../../features/projects/api/projectApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { Tabs } from '../../shared/ui/Tabs/Tabs.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { ListFilters, PageSizeField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { canManageProjectMembers, isProjectEditor } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import styles from '../../shared/styles/catalog.module.css';

export function ProjectDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState('overview');
    const push = useToastStore((s) => s.push);
    const role = useAuthStore((s) => s.session?.role);
    const employeeId = useAuthStore((s) => s.employee?.id);

    const project = useQuery({ queryKey: queryKeys.projects.one(id), queryFn: () => projectApi.getById(id) });
    const [teamQuery, setTeamQuery] = useState({ page: 0, size: 20, sortBy: 'startDate', sortDirection: 'DESC' });
    const [taskQuery, setTaskQuery] = useState({ page: 0, size: 20, sortBy: 'taskNumber', sortDirection: 'ASC' });
    const [milestoneQuery, setMilestoneQuery] = useState({ page: 0, size: 20, sortBy: 'dueDate', sortDirection: 'ASC' });
    const assignments = useQuery({
        queryKey: [...queryKeys.projects.assignments(id), teamQuery],
        queryFn: async () => unwrapPage(await projectApi.listAssignments(id, teamQuery)),
    });
    const tasks = useQuery({
        queryKey: queryKeys.projects.tasks(id, taskQuery),
        queryFn: async () => unwrapPage(await projectApi.listTasks(id, taskQuery)),
    });
    const roles = useQuery({ queryKey: queryKeys.catalogs.projectRoles, queryFn: async () => unwrapPage(await projectApi.listRoles()).content });
    const milestones = useQuery({
        queryKey: [...queryKeys.projects.milestones(id), milestoneQuery],
        queryFn: async () => unwrapPage(await projectApi.listMilestones(id, milestoneQuery)),
    });
    const links = useQuery({
        queryKey: queryKeys.projects.links(id),
        queryFn: () => projectApi.listLinks(id),
    });
    const [assignment, setAssignment] = useState({ employeeId: '', projectRoleId: '', startDate: '', allocationPercent: '' });
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [editingLink, setEditingLink] = useState(null);
    const [edit, setEdit] = useState(null);
    const [nextStatus, setNextStatus] = useState('');
    const [milestone, setMilestone] = useState({ title: '', dueDate: '', description: '' });
    const [link, setLink] = useState({ label: '', url: '' });
    const assign = useMutation({
        mutationFn: () => {
            const payload = { ...assignment, projectId: id };
            if (payload.allocationPercent === '') {
                delete payload.allocationPercent;
            }
            return projectApi.assign(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(id) });
            push({ type: 'success', message: t('projects.assignSuccess') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const saveProject = useMutation({
        mutationFn: () => projectApi.update(id, Object.fromEntries(Object.entries(edit).filter(([, value]) => value !== '' && value != null))),
        onSuccess: () => {
            setEdit(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.one(id) });
        },
        onError,
    });
    const changeStatus = useMutation({
        mutationFn: () => projectApi.changeStatus(id, { status: nextStatus, expectedVersion: project.data?.version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.one(id) }),
        onError,
    });
    const endAssignment = useMutation({
        mutationFn: (row) => projectApi.endAssignment(row.id, { endDate: new Date().toISOString().slice(0, 10), expectedVersion: row.version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(id) }),
        onError,
    });
    const addMilestone = useMutation({
        mutationFn: () => projectApi.createMilestone(id, { ...milestone, projectId: id, status: 'PLANNED' }),
        onSuccess: () => {
            setMilestone({ title: '', dueDate: '', description: '' });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.milestones(id) });
        },
        onError,
    });
    const saveAssignment = useMutation({
        mutationFn: () => projectApi.updateAssignment(editingAssignment.id, {
            projectRoleId: editingAssignment.projectRoleId,
            startDate: editingAssignment.startDate,
            endDate: editingAssignment.endDate || null,
            allocationPercent: editingAssignment.allocationPercent === '' ? null : Number(editingAssignment.allocationPercent),
        }),
        onSuccess: () => {
            setEditingAssignment(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(id) });
        },
        onError,
    });
    const removeMilestone = useMutation({
        mutationFn: (milestoneId) => projectApi.deleteMilestone(milestoneId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.milestones(id) }),
        onError,
    });
    const addLink = useMutation({
        mutationFn: () => projectApi.createLink(id, { ...link, projectId: id }),
        onSuccess: () => {
            setLink({ label: '', url: '' });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.links(id) });
        },
        onError,
    });
    const saveMilestone = useMutation({
        mutationFn: () => projectApi.updateMilestone(editingMilestone.id, {
            title: editingMilestone.title,
            description: editingMilestone.description,
            dueDate: editingMilestone.dueDate || null,
            status: editingMilestone.status,
        }),
        onSuccess: () => {
            setEditingMilestone(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.milestones(id) });
        },
        onError,
    });
    const saveLink = useMutation({
        mutationFn: () => projectApi.updateLink(editingLink.id, { label: editingLink.label, url: editingLink.url }),
        onSuccess: () => {
            setEditingLink(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.links(id) });
        },
        onError,
    });
    const removeLink = useMutation({
        mutationFn: (linkId) => projectApi.deleteLink(linkId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.links(id) }),
        onError,
    });

    if (project.isLoading) {
        return <Skeleton rows={8} />;
    }

    if (project.isError || !project.data) {
        return <PageState title={t('projects.notFound')} actionLabel={t('projects.backToList')} onAction={() => navigate('/app/projects')} />;
    }

    const data = project.data;
    const status = {
        label: enumLabel(t, 'projectStatus', data.status),
        tone: statusTone('projectStatus', data.status),
    };
    const team = assignments.data?.content || [];
    const taskList = tasks.data?.content || [];
    const canEdit = isProjectEditor(role, data, employeeId);
    const canMembers = canManageProjectMembers(role, data, employeeId);
    const milestoneList = Array.isArray(milestones.data) ? milestones.data : milestones.data?.content || [];
    const linkList = Array.isArray(links.data) ? links.data : links.data?.content || [];

    return (
        <section>
            <BackLink to="/app/projects">{t('projects.backToList')}</BackLink>
            <div className={styles.hero}>
                <div>
                    <h1>{data.name}</h1>
                    <p>{data.code} · {data.description || t('projects.noDescription')}</p>
                    <div className={styles.actions}>
                        <Button variant="secondary" onClick={() => navigate(`/app/projects/${id}/board`)}>{t('projects.openKanban')}</Button>
                    </div>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>{t('projects.team')}</span>
                        <strong>{assignments.data?.totalElements ?? team.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('projects.tasks')}</span>
                        <strong className={styles.inProgress}>{tasks.data?.totalElements ?? taskList.length}</strong>
                    </div>
                    <div className={styles.stat}>
                        <span>{t('projects.status')}</span>
                        <strong><Badge tone={status.tone}>{status.label}</Badge></strong>
                    </div>
                </div>
            </div>
            <Tabs
                items={[
                        { id: 'overview', label: t('projects.tabOverview') },
                        { id: 'team', label: t('projects.tabTeam') },
                        { id: 'tasks', label: t('projects.tabTasks') },
                        { id: 'milestones', label: t('projects.tabMilestones') },
                        { id: 'links', label: t('projects.tabLinks') },
                        { id: 'time', label: t('projects.tabTime') },
                ]}
                value={tab}
                onChange={setTab}
            />
            {tab === 'overview' && (
                <div className={styles.gridTwo}>
                    <article className={styles.panel}>
                        <h2>{t('projects.datesAndRoles')}</h2>
                        <div className={styles.row}><span>{t('projects.startDate')}</span><strong>{formatDate(data.startDate)}</strong></div>
                        <div className={styles.row}><span>{t('projects.endDate')}</span><strong>{formatDate(data.endDate)}</strong></div>
                        <div className={styles.row}><span>{t('projects.projectManager')}</span><strong>{data.projectManager?.fullName || data.projectManagerId || '—'}</strong></div>
                        <div className={styles.row}><span>{t('projects.deliveryManager')}</span><strong>{data.deliveryManager?.fullName || data.deliveryManagerId || '—'}</strong></div>
                    </article>
                    <article className={styles.panel}>
                        <h2>{t('projects.description')}</h2>
                        <p className={styles.description}>{data.description || t('projects.noDescription')}</p>
                        {canEdit ? (
                            edit ? (
                                <div className={styles.stack}>
                                    <div className={styles.gridTwo}>
                                        <Input label={t('projects.code')} value={edit.code || ''} onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
                                        <Input label={t('projects.name')} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                                        <Input type="date" label={t('projects.startDate')} value={edit.startDate || ''} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
                                        <Input type="date" label={t('projects.endDate')} value={edit.endDate || ''} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
                                        <EmployeePicker label={t('projects.projectManager')} value={edit.projectManagerId || ''} onChange={(e) => setEdit({ ...edit, projectManagerId: e.target.value })} />
                                        <EmployeePicker label={t('projects.deliveryManager')} value={edit.deliveryManagerId || ''} onChange={(e) => setEdit({ ...edit, deliveryManagerId: e.target.value })} />
                                    </div>
                                    <Textarea label={t('projects.description')} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                                    <div className={styles.actions}>
                                        <Button onClick={() => saveProject.mutate()}>{t('projects.saveProject')}</Button>
                                        <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.actions}>
                                    <Button onClick={() => setEdit({ name: data.name, description: data.description || '', code: data.code, startDate: data.startDate, endDate: data.endDate || '', projectManagerId: data.projectManagerId, deliveryManagerId: data.deliveryManagerId })}>{t('common.edit')}</Button>
                                    <Select value={nextStatus || data.status} onChange={(e) => setNextStatus(e.target.value)}>
                                        {['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((item) => (
                                            <option key={item} value={item}>{enumLabel(t, 'projectStatus', item)}</option>
                                        ))}
                                    </Select>
                                    <Button variant="secondary" onClick={() => changeStatus.mutate()}>{t('projects.changeStatus')}</Button>
                                </div>
                            )
                        ) : null}
                    </article>
                </div>
            )}
            {tab === 'team' && (
                <div className={styles.stack}>
                    <div className={styles.grid}>
                        {team.map((row) => (
                            <article key={row.id || row.employeeId} className={styles.card}>
                                <div className={styles.cardHead}>
                                    <h2>{row.employeeFullName || t('projects.employee')}</h2>
                                </div>
                                <p className={styles.description}>{row.projectRoleName || t('projects.roleMissing')}</p>
                                <div className={styles.row}><span>{t('projects.from')}</span><strong>{formatDate(row.startDate)}</strong></div>
                                <div className={styles.row}><span>{t('projects.to')}</span><strong>{formatDate(row.endDate)}</strong></div>
                                {canMembers && editingAssignment?.id === row.id ? (
                                    <div className={styles.stack}>
                                        <Select label={t('projects.role')} value={editingAssignment.projectRoleId || ''} onChange={(e) => setEditingAssignment({ ...editingAssignment, projectRoleId: e.target.value })}>
                                            <option value="">{t('common.select')}</option>
                                            {(roles.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </Select>
                                        <Input type="date" label={t('projects.from')} value={editingAssignment.startDate || ''} onChange={(e) => setEditingAssignment({ ...editingAssignment, startDate: e.target.value })} />
                                        <Input type="date" label={t('projects.to')} value={editingAssignment.endDate || ''} onChange={(e) => setEditingAssignment({ ...editingAssignment, endDate: e.target.value })} />
                                        <Input type="number" label={t('projects.allocation')} value={editingAssignment.allocationPercent ?? ''} onChange={(e) => setEditingAssignment({ ...editingAssignment, allocationPercent: e.target.value })} />
                                        <Button onClick={() => saveAssignment.mutate()}>{t('common.save')}</Button>
                                        <Button variant="ghost" onClick={() => setEditingAssignment(null)}>{t('common.cancel')}</Button>
                                    </div>
                                ) : null}
                                {canMembers && !row.endDate ? (
                                    <div className={styles.actions}>
                                        <Button variant="ghost" onClick={() => setEditingAssignment({
                                            id: row.id,
                                            projectRoleId: row.projectRoleId || '',
                                            startDate: row.startDate || '',
                                            endDate: row.endDate || '',
                                            allocationPercent: row.allocationPercent ?? '',
                                        })}>{t('common.edit')}</Button>
                                        <Button variant="ghost" onClick={() => endAssignment.mutate(row)}>{t('projects.endAssignment')}</Button>
                                    </div>
                                ) : null}
                                <Link className={styles.more} to={`/app/employees/${row.employeeId}`}>{t('projects.toProfile')}</Link>
                            </article>
                        ))}
                    </div>
                    {!team.length ? <p className={styles.footer}>{t('projects.emptyTeam')}</p> : null}
                    <ListFilters>
                        <PageSizeField value={teamQuery.size} onChange={(size) => setTeamQuery({ ...teamQuery, size, page: 0 })} />
                    </ListFilters>
                    <Pagination
                        page={assignments.data?.number || 0}
                        totalPages={assignments.data?.totalPages || 0}
                        onChange={(pageNumber) => setTeamQuery({ ...teamQuery, page: pageNumber })}
                    />
                    {canMembers ? (
                    <article className={styles.panel}>
                        <h2>{t('projects.assign')}</h2>
                        <div className={styles.gridTwo}>
                            <EmployeePicker label={t('projects.employee')} value={assignment.employeeId} onChange={(e) => setAssignment({ ...assignment, employeeId: e.target.value })} />
                            <Select label={t('projects.role')} value={assignment.projectRoleId} onChange={(e) => setAssignment({ ...assignment, projectRoleId: e.target.value })}>
                                <option value="">{t('common.select')}</option>
                                {(roles.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </Select>
                            <Input type="date" label={t('projects.startDate')} value={assignment.startDate} onChange={(e) => setAssignment({ ...assignment, startDate: e.target.value })} />
                            <Input type="number" label={t('projects.allocation')} value={assignment.allocationPercent} onChange={(e) => setAssignment({ ...assignment, allocationPercent: e.target.value })} />
                        </div>
                        <div className={styles.actions}>
                            <Button onClick={() => assign.mutate()} disabled={!assignment.employeeId || !assignment.projectRoleId}>{t('projects.assignAction')}</Button>
                        </div>
                    </article>
                    ) : null}
                </div>
            )}
            {tab === 'tasks' && (
                <>
                    <div className={styles.grid}>
                        {taskList.map((row) => (
                            <article key={row.id} className={styles.card}>
                                <div className={styles.cardHead}>
                                    <h2>{row.title}</h2>
                                    <Badge>{row.status}</Badge>
                                </div>
                                <p className={styles.description}>{row.key || row.taskNumber || t('projects.noCode')}</p>
                                <div className={styles.row}><span>{t('projects.priority')}</span><strong>{enumLabel(t, 'priority', row.priority)}</strong></div>
                                <button type="button" className={styles.more} onClick={() => navigate(`/app/tasks/${row.id}`)}>{t('projects.open')}</button>
                            </article>
                        ))}
                    </div>
                    {!taskList.length ? <p className={styles.footer}>{t('projects.emptyTasks')}</p> : null}
                    <ListFilters>
                        <PageSizeField value={taskQuery.size} onChange={(size) => setTaskQuery({ ...taskQuery, size, page: 0 })} />
                    </ListFilters>
                    <Pagination
                        page={tasks.data?.number || 0}
                        totalPages={tasks.data?.totalPages || 0}
                        onChange={(pageNumber) => setTaskQuery({ ...taskQuery, page: pageNumber })}
                    />
                </>
            )}
            {tab === 'milestones' && (
                <div className={styles.stack}>
                    {milestoneList.map((item) => (
                        <article key={item.id} className={styles.panel}>
                            <h2>{item.title}</h2>
                            <p className={styles.description}>{item.description}</p>
                            <div className={styles.row}><span>{t('projects.dueDate')}</span><strong>{formatDate(item.dueDate)}</strong></div>
                            {canEdit && editingMilestone?.id === item.id ? (
                                <div className={styles.stack}>
                                    <Input label={t('projects.name')} value={editingMilestone.title || ''} onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })} />
                                    <Textarea label={t('projects.description')} value={editingMilestone.description || ''} onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })} />
                                    <Input type="date" label={t('projects.dueDate')} value={editingMilestone.dueDate || ''} onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })} />
                                    <Button onClick={() => saveMilestone.mutate()}>{t('common.save')}</Button>
                                    <Button variant="ghost" onClick={() => setEditingMilestone(null)}>{t('common.cancel')}</Button>
                                </div>
                            ) : null}
                            {canEdit ? (
                                <div className={styles.actions}>
                                    <Button variant="ghost" onClick={() => setEditingMilestone({ id: item.id, title: item.title, description: item.description || '', dueDate: item.dueDate || '', status: item.status || 'PLANNED' })}>{t('common.edit')}</Button>
                                    <Button variant="danger" onClick={() => removeMilestone.mutate(item.id)}>{t('common.delete')}</Button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                    <ListFilters>
                        <PageSizeField value={milestoneQuery.size} onChange={(size) => setMilestoneQuery({ ...milestoneQuery, size, page: 0 })} />
                    </ListFilters>
                    <Pagination
                        page={milestones.data?.number || 0}
                        totalPages={milestones.data?.totalPages || 0}
                        onChange={(pageNumber) => setMilestoneQuery({ ...milestoneQuery, page: pageNumber })}
                    />
                    {canEdit ? (
                        <article className={styles.panel}>
                            <Input label={t('projects.name')} value={milestone.title} onChange={(e) => setMilestone({ ...milestone, title: e.target.value })} />
                            <Input type="date" label={t('projects.dueDate')} value={milestone.dueDate} onChange={(e) => setMilestone({ ...milestone, dueDate: e.target.value })} />
                            <Button onClick={() => addMilestone.mutate()} disabled={!milestone.title}>{t('projects.addMilestone')}</Button>
                        </article>
                    ) : null}
                </div>
            )}
            {tab === 'links' && (
                <div className={styles.stack}>
                    {linkList.map((item) => (
                        <article key={item.id} className={styles.panel}>
                            {editingLink?.id === item.id ? (
                                <div className={styles.stack}>
                                    <Input label={t('projects.label')} value={editingLink.label || ''} onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })} />
                                    <Input label={t('projects.url')} value={editingLink.url || ''} onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })} />
                                    <Button onClick={() => saveLink.mutate()}>{t('common.save')}</Button>
                                    <Button variant="ghost" onClick={() => setEditingLink(null)}>{t('common.cancel')}</Button>
                                </div>
                            ) : <a href={item.url} target="_blank" rel="noreferrer">{item.label || item.url}</a>}
                            {canEdit ? (
                                <div className={styles.actions}>
                                    <Button variant="ghost" onClick={() => setEditingLink({ id: item.id, label: item.label || '', url: item.url || '' })}>{t('common.edit')}</Button>
                                    <Button variant="danger" onClick={() => removeLink.mutate(item.id)}>{t('common.delete')}</Button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                    {canEdit ? (
                        <article className={styles.panel}>
                            <Input label={t('projects.label')} value={link.label} onChange={(e) => setLink({ ...link, label: e.target.value })} />
                            <Input label={t('projects.url')} value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} />
                            <Button onClick={() => addLink.mutate()} disabled={!link.url}>{t('projects.addLink')}</Button>
                        </article>
                    ) : null}
                </div>
            )}
            {tab === 'time' && (
                <article className={styles.panel}>
                    <h2>{t('projects.tabTime')}</h2>
                    <p className={styles.empty}>{t('projects.timeHint')}</p>
                </article>
            )}
        </section>
    );
}
