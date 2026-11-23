import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, Mail, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyticsApi } from '../../analytics/api/analyticsApi.js';
import { employeeApi } from '../api/employeeApi.js';
import { authApi } from '../../auth/api/authApi.js';
import { projectApi } from '../../projects/api/projectApi.js';
import { useCatalogs } from '../hooks/useCatalogs.js';
import { queryKeys } from '../../../shared/api/queryKeys.js';
import { unwrapPage } from '../../../shared/lib/queryParams.js';
import { catalogName, formatDate, formatMonthYear, formatScorePercent, fullName, localTodayIso, valueOrDash } from '../../../shared/lib/format.js';
import { useEmployeeLabels } from '../../../shared/lib/displayNames.js';
import { enumLabel, statusTone } from '../../../shared/lib/enums.js';
import { canCreateAccounts, canManageHr, canSeeMilitary, ROLES } from '../../../shared/lib/roles.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useToastStore } from '../../../store/toastStore.js';
import { getApiError } from '../../../shared/api/errors.js';
import { Tabs } from '../../../shared/ui/Tabs/Tabs.jsx';
import { Badge } from '../../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../../shared/ui/Input/Input.jsx';
import { PageState, Skeleton } from '../../../shared/ui/PageState/PageState.jsx';
import { DataTable } from '../../../shared/ui/DataTable/DataTable.jsx';
import { Modal } from '../../../shared/ui/Modal/Modal.jsx';
import { BackLink } from '../../../shared/ui/BackLink/BackLink.jsx';
import { EmployeeForm } from './EmployeeForm.jsx';
import styles from './EmployeeProfile.module.css';

const EDUCATION_LEVELS = ['SECONDARY', 'VOCATIONAL', 'BACHELOR', 'MASTER', 'DOCTORATE'];
const MILITARY_STATUSES = ['NOT_APPLICABLE', 'LIABLE', 'COMPLETED', 'EXEMPT', 'DEFERRED'];
const EMPLOYMENT = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];

function omitEmpty(values) {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value != null));
}

function Field({ label, value }) {
    return (
        <div className={styles.field}>
            <span className={styles.label}>{label}</span>
            <div className={styles.value}>{value && typeof value === 'object' ? value : valueOrDash(value)}</div>
        </div>
    );
}

function lineManagerOf(employee) {
    return (employee?.responsibilities || []).find((row) => (
        !row.endDate && row.responsibilityType?.code === 'LINE_MANAGER'
    ));
}

export function EmployeeProfile({ employeeId, isSelf = false }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const session = useAuthStore((state) => state.session);
    const currentEmployeeId = useAuthStore((state) => state.employee?.id);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isReady = useAuthStore((state) => state.isReady);
    const role = session?.role;
    const linkQuery = useQuery({
        queryKey: queryKeys.employees.byUser(session?.userId),
        queryFn: () => employeeApi.getByUserId(session.userId),
        enabled: isSelf && !employeeId && Boolean(isAuthenticated && session?.userId),
        retry: 2,
    });
    const activeId = employeeId || (isSelf ? linkQuery.data?.id : undefined);
    const catalogs = useCatalogs();
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const fileRef = useRef(null);
    const [tab, setTab] = useState('profile');
    const [editing, setEditing] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(false);
    const [status, setStatus] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const query = useQuery({
        queryKey: queryKeys.employees.one(activeId),
        queryFn: () => employeeApi.getById(activeId),
        enabled: Boolean(activeId),
    });
    const account = useQuery({
        queryKey: ['users', 'by-employee', activeId],
        enabled: Boolean(activeId) && role === ROLES.ADMIN,
        queryFn: () => authApi.getUserByEmployee(activeId),
        retry: false,
    });
    const subordinates = useQuery({
        queryKey: ['employees', 'subordinates', activeId],
        enabled: Boolean(activeId),
        queryFn: () => employeeApi.listResponsibilitiesByResponsible(activeId),
        retry: false,
    });
    const removeEmployee = useMutation({
        mutationFn: () => employeeApi.deleteEmployee(activeId),
        onSuccess: () => navigate('/app/employees'),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const types = useQuery({
        queryKey: ['responsibility-types'],
        queryFn: async () => unwrapPage(await employeeApi.listResponsibilityTypes({ page: 0, size: 100, sortBy: 'name' })).content,
    });

    const people = useQuery({
        queryKey: queryKeys.employees.all({ size: 100, sortBy: 'lastName' }),
        queryFn: async () => unwrapPage(await employeeApi.list({ page: 0, size: 100, sortBy: 'lastName' })),
        enabled: canManageHr(role),
    });

    const projects = useQuery({
        queryKey: ['employee-projects', activeId],
        enabled: Boolean(activeId) && tab === 'projects',
        queryFn: async () => {
            const participation = unwrapPage(await projectApi.listParticipation(activeId));
            const rows = [];
            for (const assignment of participation.content || []) {
                const project = await projectApi.getById(assignment.projectId);
                const tasks = unwrapPage(await projectApi.listTasks(project.id, {
                    page: 0,
                    size: 50,
                    sortBy: 'taskNumber',
                    assigneeEmployeeId: activeId,
                }));
                const employeeTasks = tasks.content || [];
                rows.push({ project, assignments: [assignment], tasks: employeeTasks });
            }
            return rows;
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.one(activeId) });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const onSaved = () => {
        invalidate();
        push({ type: 'success', message: t('common.saved') });
    };

    const assessments = useQuery({
        queryKey: ['analytics', 'assessments', activeId],
        enabled: Boolean(activeId),
        queryFn: () => analyticsApi.assessments(activeId),
    });
    const latestAssessment = (assessments.data || [])[0];
    const managerRelation = lineManagerOf(query.data);
    const managerId = managerRelation?.responsibleEmployee?.id || managerRelation?.responsibleEmployeeId;
    const managerName = useEmployeeLabels(managerId ? [managerId] : []);

    const update = useMutation({
        mutationFn: (payload) => employeeApi.update(activeId, payload),
        onSuccess: () => {
            setFormErrors({});
            onSaved();
            setEditing(false);
        },
        onError: (error) => {
            const parsed = getApiError(error);
            setFormErrors(parsed.fieldErrors || {});
            push({ type: 'error', message: parsed.message });
        },
    });
    const changeStatus = useMutation({
        mutationFn: () => employeeApi.changeStatus(activeId, status),
        onSuccess: onSaved,
        onError,
    });
    const upload = useMutation({
        mutationFn: (file) => employeeApi.uploadPhoto(activeId, file),
        onSuccess: onSaved,
        onError,
    });
    const removePhoto = useMutation({
        mutationFn: () => employeeApi.deletePhoto(activeId),
        onSuccess: onSaved,
        onError,
    });
    const updateDepartment = useMutation({
        mutationFn: (payload) => employeeApi.updateDepartment(query.data.department.id, payload),
        onSuccess: () => {
            onSaved();
            setEditingDepartment(false);
        },
        onError,
    });

    if (!activeId) {
        const waitingForLink = isSelf && Boolean(isAuthenticated && session?.userId)
            && (!isReady || linkQuery.isLoading || linkQuery.isFetching || !linkQuery.isFetched);
        if (waitingForLink) {
            return <Skeleton rows={8} />;
        }
        if (isSelf && linkQuery.isError && getApiError(linkQuery.error).status !== 404) {
            return <PageState title={t('profile.loadFailed')} onAction={() => linkQuery.refetch()} actionLabel={t('common.retry')} />;
        }
        return <PageState title={t('profile.unavailable')} description={t('profile.unlinked')} />;
    }

    if (query.isLoading) {
        return <Skeleton rows={8} />;
    }

    if (query.isError) {
        const parsed = getApiError(query.error);
        if (parsed.status === 403) {
            return <PageState title={t('profile.forbidden')} />;
        }
        if (parsed.status === 404) {
            return <PageState title={t('profile.notFound')} />;
        }
        return <PageState title={t('profile.loadFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />;
    }

    const employee = query.data;
    const canEditOrg = role === ROLES.HR || role === ROLES.ADMIN;
    const isLineManager = (employee.responsibilities || []).some((row) =>
        !row.endDate
        && row.responsibilityType?.code === 'LINE_MANAGER'
        && String(row.responsibleEmployee?.id) === String(currentEmployeeId)
    );
    const canEditPersonal = isSelf || canEditOrg || isLineManager;
    const canAssignDepartment = canEditOrg || (isLineManager && !isSelf);
    const canEditOwnDepartment = isSelf && role === ROLES.MANAGER && Boolean(employee?.department?.id);
    const addLabels = {
        skills: t('profile.addSkill'),
        experience: t('profile.addExperience'),
        education: t('profile.addEducation'),
        responsibilities: t('profile.addResponsibility'),
    };
    const canAddOnTab = (tab === 'responsibilities' ? canEditOrg : canEditPersonal) && Boolean(addLabels[tab]);

    const tabs = [
        { id: 'profile', label: t('profile.tabProfile') },
        { id: 'skills', label: t('profile.tabSkills') },
        { id: 'experience', label: t('profile.tabExperience') },
        { id: 'education', label: t('profile.tabEducation') },
        { id: 'military', label: t('profile.tabMilitary') },
        { id: 'responsibilities', label: t('profile.tabResponsibilities') },
        { id: 'projects', label: t('profile.tabProjects') },
    ].filter((item) => item.id !== 'military' || isSelf || canSeeMilitary(role));

    return (
        <section>
            {!isSelf ? <BackLink to="/app/employees">{t('common.back')}</BackLink> : null}
            <div className={styles.header}>
                {employee.profilePhoto?.url ? (
                    <img src={employee.profilePhoto.url} alt="" className={styles.photo} />
                ) : (
                    <div className={styles.photoFallback} />
                )}
                <div className={styles.headerBody}>
                    <div className={styles.nameRow}>
                        <h1>{fullName(employee)}</h1>
                        <Badge tone={statusTone('employmentStatus', employee.employmentStatus)}>
                            {enumLabel(t, 'employmentStatus', employee.employmentStatus)}
                        </Badge>
                    </div>
                    <div className={styles.meta}>
                        <span className={styles.metaItem}><Briefcase size={16} /> {catalogName(employee.position)}</span>
                        <span className={styles.metaItem}><Building2 size={16} /> {catalogName(employee.department)}</span>
                        <span className={styles.metaItem}><Mail size={16} /> {valueOrDash(employee.email)}</span>
                        {managerId ? (
                            <span className={styles.metaItem}>
                                <UserRound size={16} />
                                <Link to={`/app/employees/${managerId}`}>
                                    {fullName(managerRelation?.responsibleEmployee) !== '—'
                                        ? fullName(managerRelation.responsibleEmployee)
                                        : (managerName(managerId) || t('profile.lineManager'))}
                                </Link>
                            </span>
                        ) : null}
                    </div>
                    {canEditPersonal ? (
                        <div className={styles.actions}>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        upload.mutate(file);
                                    }
                                    event.target.value = '';
                                }}
                            />
                            <Button variant="secondary" onClick={() => fileRef.current?.click()}>{t('profile.uploadPhoto')}</Button>
                            {employee.profilePhoto ? <Button variant="ghost" onClick={() => removePhoto.mutate()}>{t('profile.removePhoto')}</Button> : null}
                            {canCreateAccounts(role) && employee.employmentStatus === 'TERMINATED' ? (
                                <Button variant="danger" onClick={() => removeEmployee.mutate()}>{t('profile.deleteEmployee')}</Button>
                            ) : null}
                            {account.data?.id ? <Link to={`/app/admin/users/${account.data.id}`}>{t('profile.openAccount')}</Link> : null}
                        </div>
                    ) : null}
                    {canCreateAccounts(role) && employee.employmentStatus === 'TERMINATED' && !canEditPersonal ? (
                        <Button variant="danger" onClick={() => removeEmployee.mutate()}>{t('profile.deleteEmployee')}</Button>
                    ) : null}
                    {account.data?.id && !canEditPersonal ? <Link to={`/app/admin/users/${account.data.id}`}>{t('profile.openAccount')}</Link> : null}
                </div>
            </div>
            <Tabs
                items={tabs}
                value={tab}
                onChange={(next) => {
                    setTab(next);
                    setAddOpen(false);
                }}
                actions={canAddOnTab ? (
                    <Button onClick={() => setAddOpen(true)}>{addLabels[tab]}</Button>
                ) : null}
            />
            {tab === 'profile' && (
                <article className={styles.panel}>
                    <div className={styles.fields}>
                        <Field label={t('profile.firstName')} value={employee.firstName} />
                        <Field label={t('profile.lastName')} value={employee.lastName} />
                        <Field label={t('profile.middleName')} value={employee.middleName} />
                        <Field label={t('profile.employmentStatus')} value={enumLabel(t, 'employmentStatus', employee.employmentStatus)} />
                        <Field label={t('profile.position')} value={catalogName(employee.position)} />
                        <Field label={t('profile.grade')} value={catalogName(employee.grade)} />
                        <Field
                            label={t('profile.development')}
                            value={latestAssessment
                                ? `${t('analyticsUi.score')}: ${formatScorePercent(latestAssessment.totalScore)}`
                                : t('profile.noDevelopment')}
                        />
                        <Field label={t('profile.specialization')} value={employee.specialization?.name} />
                        <Field label={t('profile.hireDate')} value={employee.hireDate ? formatMonthYear(employee.hireDate) : null} />
                        <Field label={t('profile.birthDate')} value={employee.birthDate ? formatDate(employee.birthDate) : null} />
                        <Field label={t('profile.department')} value={catalogName(employee.department)} />
                        <Field label={t('profile.maxSubordinates')} value={employee.maxSubordinates} />
                    </div>
                    <div className={styles.actions}>
                        {canEditPersonal ? <Button onClick={() => setEditing(true)}>{t('common.edit')}</Button> : null}
                        {canEditOwnDepartment ? (
                            <Button variant="secondary" onClick={() => setEditingDepartment(true)}>
                                {t('profile.editDepartment')}
                            </Button>
                        ) : null}
                        {canEditOrg ? (
                            <>
                                <div className={styles.statusField}>
                                    <Select value={status || employee.employmentStatus} onChange={(event) => setStatus(event.target.value)}>
                                        {EMPLOYMENT.map((item) => <option key={item} value={item}>{enumLabel(t, 'employmentStatus', item)}</option>)}
                                    </Select>
                                </div>
                                <Button
                                    variant="secondary"
                                    disabled={!status || status === employee.employmentStatus}
                                    onClick={() => changeStatus.mutate()}
                                >
                                    {t('profile.changeStatus')}
                                </Button>
                            </>
                        ) : null}
                    </div>
                    <Modal open={editing && canEditPersonal} title={t('common.edit')} onClose={() => setEditing(false)}>
                        <EmployeeForm
                            key={employee.updatedAt || employee.id}
                            catalogs={catalogs}
                            submitting={update.isPending}
                            includeStatus={canEditOrg}
                            includeOrg={canEditOrg}
                            includeDepartment={canAssignDepartment}
                            onCancel={() => setEditing(false)}
                            values={{
                                firstName: employee.firstName,
                                lastName: employee.lastName,
                                middleName: employee.middleName,
                                email: employee.email,
                                birthDate: employee.birthDate,
                                hireDate: employee.hireDate,
                                positionId: employee.position?.id,
                                gradeId: employee.grade?.id,
                                departmentId: employee.department?.id,
                                specializationId: employee.specialization?.id,
                                employmentStatus: employee.employmentStatus,
                                maxSubordinates: employee.maxSubordinates,
                            }}
                            errors={formErrors}
                            onSubmit={(values) => update.mutate(values)}
                        />
                    </Modal>
                    <Modal
                        open={editingDepartment}
                        title={t('profile.editDepartment')}
                        onClose={() => setEditingDepartment(false)}
                    >
                        <form
                            className={styles.fields}
                            onSubmit={(event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                updateDepartment.mutate({
                                    name: form.get('name'),
                                    description: form.get('description'),
                                });
                            }}
                        >
                            <Input name="name" label={t('form.name')} defaultValue={employee.department?.name || ''} required />
                            <Textarea name="description" label={t('form.description')} defaultValue={employee.department?.description || ''} />
                            <div className={styles.actions}>
                                <Button type="submit" disabled={updateDepartment.isPending}>{t('common.save')}</Button>
                                <Button type="button" variant="ghost" onClick={() => setEditingDepartment(false)}>{t('common.cancel')}</Button>
                            </div>
                        </form>
                    </Modal>
                </article>
            )}
            {tab === 'skills' && <SkillsTab employee={employee} canEdit={canEditPersonal} skills={catalogs.skills} addOpen={addOpen} onAddOpenChange={setAddOpen} onSaved={onSaved} onError={onError} />}
            {tab === 'experience' && <ExperienceTab employee={employee} canEdit={canEditPersonal} addOpen={addOpen} onAddOpenChange={setAddOpen} onSaved={onSaved} onError={onError} />}
            {tab === 'education' && <EducationTab employee={employee} canEdit={canEditPersonal} addOpen={addOpen} onAddOpenChange={setAddOpen} onSaved={onSaved} onError={onError} />}
            {tab === 'military' && <MilitaryTab employee={employee} canEdit={isSelf || canEditOrg} onSaved={onSaved} onError={onError} />}
            {tab === 'responsibilities' && (
                <ResponsibilitiesTab
                    employee={employee}
                    canEdit={canEditOrg}
                    types={types.data || []}
                    people={people.data?.content || []}
                    addOpen={addOpen}
                    onAddOpenChange={setAddOpen}
                    onSaved={onSaved}
                    onError={onError}
                />
            )}
            {tab === 'projects' && (
                <div className={styles.stack}>
                    {(projects.data || []).map((row) => (
                        <article key={row.project.id} className={styles.panel}>
                            <h2><Link to={`/app/projects/${row.project.id}`}>{row.project.name}</Link></h2>
                            <p className={styles.note}>{row.project.code}</p>
                            {(row.tasks || []).map((task) => (
                                <p key={task.id}><Link to={`/app/tasks/${task.id}`}>{task.title}</Link></p>
                            ))}
                            {!row.tasks?.length ? <p className={styles.empty}>{t('projects.emptyTasks')}</p> : null}
                        </article>
                    ))}
                    {projects.isLoading ? <Skeleton rows={3} /> : null}
                    {projects.isError ? (
                        <PageState
                            title={t('projects.loadFailed')}
                            description={getApiError(projects.error).message}
                            actionLabel={t('common.retry')}
                            onAction={() => projects.refetch()}
                        />
                    ) : null}
                    {!projects.isLoading && !projects.isError && !projects.data?.length ? <p className={styles.empty}>{t('projects.empty')}</p> : null}
                </div>
            )}
            {tab === 'profile' && (subordinates.data || []).length ? (
                <SubordinatesBlock rows={Array.isArray(subordinates.data) ? subordinates.data : subordinates.data?.content || []} />
            ) : null}
        </section>
    );
}

function SubordinatesBlock({ rows }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const people = (rows || []).filter((row) => !row.endDate && (row.employeeId || row.employee?.id));
    const ids = people.map((row) => row.employeeId || row.employee?.id);
    const cards = useQuery({
        queryKey: ['employees', 'subordinate-cards', ...ids],
        enabled: ids.length > 0,
        queryFn: async () => {
            const list = await Promise.all(ids.map((id) => employeeApi.getById(id).catch(() => null)));
            return Object.fromEntries(ids.map((id, index) => [String(id), list[index]]));
        },
    });
    if (!people.length) {
        return null;
    }
    return (
        <article className={`${styles.panel} ${styles.subordinates}`}>
            <h2>{t('profile.subordinates')}</h2>
            <DataTable
                rows={people.map((row) => {
                    const id = row.employeeId || row.employee?.id;
                    return { ...row, id, card: cards.data?.[String(id)] };
                })}
                onRowClick={(row) => navigate(`/app/employees/${row.id}`)}
                columns={[
                    {
                        key: 'name',
                        header: t('employees.fullName'),
                        render: (row) => (
                            <Link to={`/app/employees/${row.id}`} onClick={(event) => event.stopPropagation()}>
                                {fullName(row.card) !== '—' ? fullName(row.card) : row.id}
                            </Link>
                        ),
                    },
                    {
                        key: 'position',
                        header: t('employees.position'),
                        render: (row) => catalogName(row.card?.position),
                    },
                    {
                        key: 'grade',
                        header: t('employees.grade'),
                        render: (row) => catalogName(row.card?.grade),
                    },
                    {
                        key: 'type',
                        header: t('profile.responsibilityType'),
                        render: (row) => row.responsibilityType?.name || '—',
                    },
                    {
                        key: 'status',
                        header: t('employees.status'),
                        nowrap: true,
                        render: (row) => (
                            <Badge tone={statusTone('employmentStatus', row.card?.employmentStatus)}>
                                {enumLabel(t, 'employmentStatus', row.card?.employmentStatus)}
                            </Badge>
                        ),
                    },
                ]}
            />
        </article>
    );
}

function SkillsTab({ employee, canEdit, skills, addOpen, onAddOpenChange, onSaved, onError }) {
    const { t } = useTranslation();
    const [form, setForm] = useState({ skillId: '', level: 3, yearsOfExperience: '' });
    const [edit, setEdit] = useState(null);
    const add = useMutation({
        mutationFn: () => employeeApi.addEmployeeSkill(employee.id, omitEmpty({
            skillId: form.skillId,
            level: Number(form.level),
            yearsOfExperience: form.yearsOfExperience === '' ? undefined : Number(form.yearsOfExperience),
        })),
        onSuccess: () => {
            onAddOpenChange(false);
            setForm({ skillId: '', level: 3, yearsOfExperience: '' });
            onSaved();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => employeeApi.updateEmployeeSkill(employee.id, edit.id, omitEmpty({
            level: Number(edit.level),
            yearsOfExperience: edit.yearsOfExperience === '' ? undefined : Number(edit.yearsOfExperience),
        })),
        onSuccess: () => {
            setEdit(null);
            onSaved();
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: (id) => employeeApi.deleteEmployeeSkill(employee.id, id),
        onSuccess: onSaved,
        onError,
    });

    return (
        <div className={styles.stack}>
            {(employee.skills || []).map((item) => (
                <article key={item.id} className={styles.panel}>
                    <div className={styles.fields}>
                        <Field label={t('profile.skill')} value={item.skill?.name} />
                        <Field label={t('profile.skillLevel')} value={item.level} />
                        <Field label={t('profile.yearsOfExperience')} value={item.yearsOfExperience} />
                        <Field label={t('profile.skillCategory')} value={item.skill?.category ? enumLabel(t, 'skillCategory', item.skill.category) : null} />
                    </div>
                    {canEdit ? (
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEdit({ id: item.id, level: item.level, yearsOfExperience: item.yearsOfExperience ?? '' })}>{t('common.edit')}</Button>
                            <Button variant="danger" onClick={() => remove.mutate(item.id)}>{t('common.delete')}</Button>
                        </div>
                    ) : null}
                </article>
            ))}
            {!employee.skills?.length ? <p className={styles.empty}>{t('profile.noSkills')}</p> : null}
            <Modal open={addOpen} title={t('profile.addSkill')} onClose={() => onAddOpenChange(false)}>
                <div className={styles.stack}>
                    <Select label={t('profile.skill')} value={form.skillId} onChange={(event) => setForm({ ...form, skillId: event.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                    <Input type="number" min="1" max="5" label={t('profile.skillLevel')} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} />
                    <Input type="number" label={t('profile.yearsOfExperience')} value={form.yearsOfExperience} onChange={(event) => setForm({ ...form, yearsOfExperience: event.target.value })} />
                    <div className={styles.actions}>
                        <Button onClick={() => add.mutate()} disabled={!form.skillId}>{t('common.add')}</Button>
                        <Button variant="ghost" onClick={() => onAddOpenChange(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={Boolean(edit)} title={t('common.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <div className={styles.stack}>
                        <Input type="number" min="1" max="5" label={t('profile.skillLevel')} value={edit.level} onChange={(event) => setEdit({ ...edit, level: event.target.value })} />
                        <Input type="number" label={t('profile.yearsOfExperience')} value={edit.yearsOfExperience} onChange={(event) => setEdit({ ...edit, yearsOfExperience: event.target.value })} />
                        <div className={styles.actions}>
                            <Button onClick={() => update.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}

function ExperienceTab({ employee, canEdit, addOpen, onAddOpenChange, onSaved, onError }) {
    const { t } = useTranslation();
    const empty = { company: '', position: '', description: '', startDate: '', endDate: '' };
    const [form, setForm] = useState(empty);
    const [edit, setEdit] = useState(null);
    const add = useMutation({
        mutationFn: () => employeeApi.addExperience(employee.id, omitEmpty(form)),
        onSuccess: () => {
            onAddOpenChange(false);
            setForm(empty);
            onSaved();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => employeeApi.updateExperience(employee.id, edit.id, omitEmpty(edit)),
        onSuccess: () => {
            setEdit(null);
            onSaved();
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: (id) => employeeApi.deleteExperience(employee.id, id),
        onSuccess: onSaved,
        onError,
    });

    return (
        <div className={styles.stack}>
            {(employee.experiences || []).map((item) => (
                <article key={item.id} className={styles.panel}>
                    <div className={styles.fields}>
                        <Field label={t('profile.company')} value={item.company} />
                        <Field label={t('profile.jobTitle')} value={item.position} />
                        <Field label={t('profile.startDate')} value={item.startDate ? formatDate(item.startDate) : null} />
                        <Field label={t('profile.endDate')} value={item.endDate ? formatDate(item.endDate) : null} />
                    </div>
                    {item.description ? <p className={styles.note}>{item.description}</p> : null}
                    {canEdit ? (
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEdit({ ...item, endDate: item.endDate || '', description: item.description || '' })}>{t('common.edit')}</Button>
                            <Button variant="danger" onClick={() => remove.mutate(item.id)}>{t('common.delete')}</Button>
                        </div>
                    ) : null}
                </article>
            ))}
            {!employee.experiences?.length ? <p className={styles.empty}>{t('profile.noExperience')}</p> : null}
            <Modal open={addOpen} title={t('profile.addExperience')} onClose={() => onAddOpenChange(false)}>
                <RecordForm value={form} onChange={setForm} onSave={() => add.mutate()} onCancel={() => onAddOpenChange(false)} saveLabel={t('profile.addExperience')} />
            </Modal>
            <Modal open={Boolean(edit)} title={t('common.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <RecordForm value={edit} onChange={setEdit} onSave={() => update.mutate()} onCancel={() => setEdit(null)} />
                ) : null}
            </Modal>
        </div>
    );
}

function RecordForm({ value, onChange, onSave, onCancel, saveLabel }) {
    const { t } = useTranslation();
    return (
        <div className={styles.fields}>
            <Input label={t('profile.company')} value={value.company || ''} onChange={(event) => onChange({ ...value, company: event.target.value })} />
            <Input label={t('profile.jobTitle')} value={value.position || ''} onChange={(event) => onChange({ ...value, position: event.target.value })} />
            <Input type="date" label={t('profile.startDate')} value={value.startDate || ''} onChange={(event) => onChange({ ...value, startDate: event.target.value })} />
            <Input type="date" label={t('profile.endDate')} value={value.endDate || ''} onChange={(event) => onChange({ ...value, endDate: event.target.value })} />
            <Textarea label={t('profile.description')} value={value.description || ''} onChange={(event) => onChange({ ...value, description: event.target.value })} />
            <div className={styles.actions}>
                <Button onClick={onSave} disabled={!value.company || !value.startDate}>{saveLabel || t('common.save')}</Button>
                {onCancel ? <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button> : null}
            </div>
        </div>
    );
}

function EducationTab({ employee, canEdit, addOpen, onAddOpenChange, onSaved, onError }) {
    const { t } = useTranslation();
    const empty = { institutionName: '', educationLevel: 'BACHELOR', fieldOfStudy: '', degreeName: '', startDate: '', endDate: '' };
    const [form, setForm] = useState(empty);
    const [edit, setEdit] = useState(null);
    const add = useMutation({
        mutationFn: () => employeeApi.addEducation(employee.id, omitEmpty(form)),
        onSuccess: () => {
            onAddOpenChange(false);
            setForm(empty);
            onSaved();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => employeeApi.updateEducation(employee.id, edit.id, omitEmpty(edit)),
        onSuccess: () => {
            setEdit(null);
            onSaved();
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: (id) => employeeApi.deleteEducation(employee.id, id),
        onSuccess: onSaved,
        onError,
    });

    const fields = (value, onChange) => (
        <div className={styles.fields}>
            <Input label={t('profile.institution')} value={value.institutionName || ''} onChange={(event) => onChange({ ...value, institutionName: event.target.value })} />
            <Select label={t('profile.educationLevel')} value={value.educationLevel} onChange={(event) => onChange({ ...value, educationLevel: event.target.value })}>
                {EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{enumLabel(t, 'educationLevel', level)}</option>)}
            </Select>
            <Input label={t('profile.degreeName')} value={value.degreeName || ''} onChange={(event) => onChange({ ...value, degreeName: event.target.value })} />
            <Input label={t('profile.fieldOfStudy')} value={value.fieldOfStudy || ''} onChange={(event) => onChange({ ...value, fieldOfStudy: event.target.value })} />
            <Input type="date" label={t('profile.startDate')} value={value.startDate || ''} onChange={(event) => onChange({ ...value, startDate: event.target.value })} />
            <Input type="date" label={t('profile.endDate')} value={value.endDate || ''} onChange={(event) => onChange({ ...value, endDate: event.target.value })} />
        </div>
    );

    return (
        <div className={styles.stack}>
            {(employee.educations || []).map((item) => (
                <article key={item.id} className={styles.panel}>
                    <div className={styles.fields}>
                        <Field label={t('profile.educationLevel')} value={enumLabel(t, 'educationLevel', item.educationLevel)} />
                        <Field label={t('profile.institution')} value={item.institutionName} />
                        <Field label={t('profile.fieldOfStudy')} value={item.fieldOfStudy} />
                        <Field label={t('profile.degreeName')} value={item.degreeName} />
                        <Field label={t('profile.startDate')} value={item.startDate ? formatDate(item.startDate) : null} />
                        <Field label={t('profile.endDate')} value={item.endDate ? formatDate(item.endDate) : null} />
                    </div>
                    {canEdit ? (
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEdit({ ...item, endDate: item.endDate || '', degreeName: item.degreeName || '', fieldOfStudy: item.fieldOfStudy || '' })}>{t('common.edit')}</Button>
                            <Button variant="danger" onClick={() => remove.mutate(item.id)}>{t('common.delete')}</Button>
                        </div>
                    ) : null}
                </article>
            ))}
            {!employee.educations?.length ? <p className={styles.empty}>{t('profile.noEducation')}</p> : null}
            <Modal open={addOpen} title={t('profile.addEducation')} onClose={() => onAddOpenChange(false)}>
                {fields(form, setForm)}
                <div className={styles.actions}>
                    <Button onClick={() => add.mutate()}>{t('profile.addEducation')}</Button>
                    <Button variant="ghost" onClick={() => onAddOpenChange(false)}>{t('common.cancel')}</Button>
                </div>
            </Modal>
            <Modal open={Boolean(edit)} title={t('common.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <>
                        {fields(edit, setEdit)}
                        <div className={styles.actions}>
                            <Button onClick={() => update.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                        </div>
                    </>
                ) : null}
            </Modal>
        </div>
    );
}

function MilitaryTab({ employee, canEdit, onSaved, onError }) {
    const { t } = useTranslation();
    const item = employee.militaryObligation;
    const [form, setForm] = useState({
        status: item?.status || 'NOT_APPLICABLE',
        militaryRank: item?.militaryRank || '',
        category: item?.category || '',
        documentNumber: item?.documentNumber || '',
    });
    const save = useMutation({
        mutationFn: () => (item
            ? employeeApi.updateMilitary(employee.id, omitEmpty(form))
            : employeeApi.createMilitary(employee.id, omitEmpty(form))),
        onSuccess: onSaved,
        onError,
    });
    const remove = useMutation({
        mutationFn: () => employeeApi.deleteMilitary(employee.id),
        onSuccess: onSaved,
        onError,
    });

    return (
        <article className={styles.panel}>
            {!item && !canEdit ? <p className={styles.empty}>{t('profile.noMilitary')}</p> : null}
            {item && !canEdit ? (
                <div className={styles.fields}>
                    <Field label={t('profile.militaryStatus')} value={enumLabel(t, 'militaryStatus', item.status)} />
                    <Field label={t('profile.militaryRank')} value={item.militaryRank} />
                    <Field label={t('profile.militaryCategory')} value={item.category} />
                    <Field label={t('profile.documentNumber')} value={item.documentNumber} />
                </div>
            ) : null}
            {canEdit ? (
                <>
                    <div className={styles.fields}>
                        <Select label={t('profile.militaryStatus')} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                            {MILITARY_STATUSES.map((status) => <option key={status} value={status}>{enumLabel(t, 'militaryStatus', status)}</option>)}
                        </Select>
                        <Input label={t('profile.militaryRank')} value={form.militaryRank} onChange={(event) => setForm({ ...form, militaryRank: event.target.value })} />
                        <Input label={t('profile.militaryCategory')} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                        <Input label={t('profile.documentNumber')} value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} />
                    </div>
                    <div className={styles.actions}>
                        <Button onClick={() => save.mutate()}>{t('common.save')}</Button>
                        {item ? <Button variant="danger" onClick={() => remove.mutate()}>{t('common.delete')}</Button> : null}
                    </div>
                </>
            ) : null}
        </article>
    );
}

function ResponsibilitiesTab({ employee, canEdit, types, people, addOpen, onAddOpenChange, onSaved, onError }) {
    const { t } = useTranslation();
    const items = employee.responsibilities || [];
    const [form, setForm] = useState({ responsibleEmployeeId: '', responsibilityTypeId: '', startDate: '', endDate: '' });
    const [edit, setEdit] = useState(null);
    const add = useMutation({
        mutationFn: () => employeeApi.createResponsibility(employee.id, omitEmpty(form)),
        onSuccess: () => {
            onAddOpenChange(false);
            setForm({ responsibleEmployeeId: '', responsibilityTypeId: '', startDate: '', endDate: '' });
            onSaved();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => employeeApi.updateResponsibility(edit.id, omitEmpty(edit)),
        onSuccess: () => {
            setEdit(null);
            onSaved();
        },
        onError,
    });
    const close = useMutation({
        mutationFn: (id) => employeeApi.closeResponsibility(id, localTodayIso()),
        onSuccess: onSaved,
        onError,
    });
    const remove = useMutation({
        mutationFn: (id) => employeeApi.deleteResponsibility(id),
        onSuccess: onSaved,
        onError,
    });
    const nameOf = (id) => {
        const person = people.find((item) => item.id === id);
        return person ? fullName(person) : id;
    };

    return (
        <div className={styles.stack}>
            {items.map((item) => (
                <article key={item.id} className={styles.panel}>
                    <div className={styles.fields}>
                        <Field
                            label={t('profile.responsible')}
                            value={item.responsibleEmployee?.id || item.responsibleEmployeeId ? (
                                <Link to={`/app/employees/${item.responsibleEmployee?.id || item.responsibleEmployeeId}`}>
                                    {fullName(item.responsibleEmployee) !== '—'
                                        ? fullName(item.responsibleEmployee)
                                        : nameOf(item.responsibleEmployeeId || item.responsibleEmployee?.id)}
                                </Link>
                            ) : null}
                        />
                        <Field label={t('profile.responsibilityType')} value={item.responsibilityType?.name || item.responsibilityTypeId} />
                        <Field label={t('profile.startDate')} value={item.startDate ? formatDate(item.startDate) : null} />
                        <Field label={t('profile.endDate')} value={item.endDate ? formatDate(item.endDate) : null} />
                    </div>
                    {canEdit ? (
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setEdit({ id: item.id, responsibleEmployeeId: item.responsibleEmployeeId, responsibilityTypeId: item.responsibilityTypeId, startDate: item.startDate || '', endDate: item.endDate || '' })}>{t('common.edit')}</Button>
                            {!item.endDate ? <Button variant="ghost" onClick={() => close.mutate(item.id)}>{t('profile.closeResponsibility')}</Button> : null}
                            <Button variant="danger" onClick={() => remove.mutate(item.id)}>{t('common.delete')}</Button>
                        </div>
                    ) : null}
                </article>
            ))}
            {!items.length ? <p className={styles.empty}>{t('profile.noResponsibilities')}</p> : null}
            <Modal open={addOpen} title={t('profile.addResponsibility')} onClose={() => onAddOpenChange(false)}>
                <div className={styles.fields}>
                    <Select label={t('profile.responsible')} value={form.responsibleEmployeeId} onChange={(event) => setForm({ ...form, responsibleEmployeeId: event.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {people.map((person) => <option key={person.id} value={person.id}>{fullName(person)}</option>)}
                    </Select>
                    <Select label={t('profile.responsibilityType')} value={form.responsibilityTypeId} onChange={(event) => setForm({ ...form, responsibilityTypeId: event.target.value })}>
                        <option value="">{t('common.select')}</option>
                        {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </Select>
                    <Input type="date" label={t('profile.startDate')} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </div>
                <div className={styles.actions}>
                    <Button onClick={() => add.mutate()} disabled={!form.responsibleEmployeeId || !form.responsibilityTypeId || !form.startDate}>{t('common.add')}</Button>
                    <Button variant="ghost" onClick={() => onAddOpenChange(false)}>{t('common.cancel')}</Button>
                </div>
            </Modal>
            <Modal open={Boolean(edit)} title={t('common.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <div className={styles.stack}>
                        <Input type="date" label={t('profile.startDate')} value={edit.startDate || ''} onChange={(event) => setEdit({ ...edit, startDate: event.target.value })} />
                        <Input type="date" label={t('profile.endDate')} value={edit.endDate || ''} onChange={(event) => setEdit({ ...edit, endDate: event.target.value })} />
                        <div className={styles.actions}>
                            <Button onClick={() => update.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
