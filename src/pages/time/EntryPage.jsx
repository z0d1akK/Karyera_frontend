import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import { Missing } from './timeDisplay.jsx';
import { localTodayIso } from '../../shared/lib/format.js';
import page from '../../shared/styles/page.module.css';
import styles from './TimePages.module.css';

const empty = { projectId: '', taskId: '', workDate: '', hours: '', description: '' };

export function EntryPage() {
    const { id } = useParams();
    const isNew = !id;
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const push = useToastStore((state) => state.push);
    const selfId = useAuthStore((state) => state.employee?.id);
    const [form, setForm] = useState(() => ({ ...empty, workDate: id ? '' : localTodayIso() }));
    const [reason, setReason] = useState('');

    const projects = useQuery({
        queryKey: ['projects', 'time-form'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const tasks = useQuery({
        queryKey: ['projects', form.projectId, 'tasks'],
        enabled: Boolean(form.projectId),
        queryFn: async () => unwrapPage(await projectApi.listTasks(form.projectId, { page: 0, size: 100, sortBy: 'taskNumber' })).content || [],
    });
    const entry = useQuery({
        queryKey: ['time', 'entry', id],
        enabled: !isNew,
        queryFn: () => timeApi.getEntry(id),
    });

    useEffect(() => {
        if (!entry.data) {
            return;
        }
        setForm({
            projectId: entry.data.projectId || '',
            taskId: entry.data.taskId || '',
            workDate: entry.data.workDate || '',
            hours: hoursLabel(entry.data.durationMinutes),
            description: entry.data.description || '',
        });
    }, [entry.data]);

    const own = isNew || String(entry.data?.employeeId) === String(selfId);
    const editable = own && (isNew || entry.data?.status === 'DRAFT' || entry.data?.status === 'REJECTED');
    const payload = () => ({
        projectId: form.projectId,
        taskId: form.taskId,
        workDate: form.workDate,
        durationMinutes: Math.round(Number(form.hours) * 60),
        description: form.description || null,
    });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const save = useMutation({
        mutationFn: () => (isNew ? timeApi.createEntry(payload()) : timeApi.updateEntry(id, payload())),
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: ['time'] });
            push({ type: 'success', message: t('common.saved') });
            navigate(`/app/time/entries/${saved.id}`);
        },
        onError,
    });
    const voidEntry = useMutation({
        mutationFn: () => timeApi.voidEntry(id, { reason, expectedVersion: entry.data?.version }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time'] });
            push({ type: 'success', message: t('common.saved') });
        },
        onError,
    });

    if (entry.isLoading) {
        return <Skeleton rows={6} />;
    }
    if (entry.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={entry.refetch} actionLabel={t('common.retry')} />;
    }

    return (
        <section className={page.sections}>
            <BackLink to="/app/time/entries">{t('common.back')}</BackLink>
            <PageHeader
                title={isNew ? t('time.newEntry') : t('time.entry')}
                description={!own ? t('time.readOnlyEntry') : undefined}
                actions={entry.data ? (
                    <Badge tone={statusTone('timeEntryStatus', entry.data.status)}>
                        {enumLabel(t, 'timeEntryStatus', entry.data.status)}
                    </Badge>
                ) : null}
            />
            <TimeNav />
            <Card>
                <div className={page.stack}>
                    <Select
                        label={t('time.project')}
                        value={form.projectId}
                        disabled={!editable}
                        onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: '' })}
                    >
                        <option value="">{t('common.select')}</option>
                        {(projects.data || []).map((project) => (
                            <option key={project.id} value={project.id}>{project.name || t('time.projectUnknown')}</option>
                        ))}
                    </Select>
                    {!form.projectId ? <p className={styles.hint}><Missing>{t('time.projectMissing')}</Missing></p> : null}
                    <Select
                        label={t('time.task')}
                        value={form.taskId}
                        disabled={!editable || !form.projectId}
                        onChange={(event) => setForm({ ...form, taskId: event.target.value })}
                    >
                        <option value="">{t('common.select')}</option>
                        {(tasks.data || []).map((task) => (
                            <option key={task.id} value={task.id}>{task.title || task.name || t('time.taskUnknown')}</option>
                        ))}
                    </Select>
                    {form.projectId && !form.taskId ? <p className={styles.hint}><Missing>{t('time.taskMissing')}</Missing></p> : null}
                    <Input
                        type="date"
                        label={t('time.date')}
                        value={form.workDate}
                        disabled={!editable}
                        onChange={(event) => setForm({ ...form, workDate: event.target.value })}
                    />
                    <Input
                        type="number"
                        min="0.25"
                        step="0.25"
                        label={t('time.hours')}
                        value={form.hours}
                        disabled={!editable}
                        onChange={(event) => setForm({ ...form, hours: event.target.value })}
                    />
                    <Textarea
                        label={t('time.description')}
                        value={form.description}
                        disabled={!editable}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                    {!form.description ? <p className={styles.hint}><Missing>{t('time.descriptionMissing')}</Missing></p> : null}
                    {editable ? <Button onClick={() => save.mutate()} disabled={save.isPending}>{t('common.save')}</Button> : null}
                    {editable && !isNew ? (
                        <>
                            <Textarea label={t('time.voidReason')} value={reason} onChange={(event) => setReason(event.target.value)} />
                            <Button variant="coral" onClick={() => voidEntry.mutate()} disabled={!reason || voidEntry.isPending}>{t('time.void')}</Button>
                        </>
                    ) : null}
                </div>
            </Card>
        </section>
    );
}
