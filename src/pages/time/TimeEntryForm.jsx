import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { timeApi } from '../../features/time/api/timeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import page from '../../shared/styles/page.module.css';

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export function TimeEntryForm({ initialDate = '', onCancel, onSaved }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const push = useToastStore((state) => state.push);
    const [form, setForm] = useState({
        projectId: '',
        taskId: '',
        workDate: initialDate || todayIso(),
        hours: '',
        description: '',
    });

    const projects = useQuery({
        queryKey: ['projects', 'time-form'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const tasks = useQuery({
        queryKey: ['projects', form.projectId, 'tasks'],
        enabled: Boolean(form.projectId),
        queryFn: async () => unwrapPage(await projectApi.listTasks(form.projectId, { page: 0, size: 100, sortBy: 'taskNumber' })).content || [],
    });

    const save = useMutation({
        mutationFn: () => timeApi.createEntry({
            projectId: form.projectId,
            taskId: form.taskId,
            workDate: form.workDate,
            durationMinutes: Math.round(Number(form.hours) * 60),
            description: form.description || null,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time'] });
            push({ type: 'success', message: t('common.saved') });
            onSaved?.();
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const canSave = form.projectId && form.taskId && form.workDate && Number(form.hours) > 0;

    return (
        <div className={page.stack}>
            <Select
                label={t('time.project')}
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: '' })}
            >
                <option value="">{t('common.select')}</option>
                {(projects.data || []).map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </Select>
            <Select
                label={t('time.task')}
                value={form.taskId}
                disabled={!form.projectId}
                onChange={(event) => setForm({ ...form, taskId: event.target.value })}
            >
                <option value="">{t('common.select')}</option>
                {(tasks.data || []).map((task) => (
                    <option key={task.id} value={task.id}>{task.title || task.name}</option>
                ))}
            </Select>
            <Input type="date" label={t('time.date')} value={form.workDate} onChange={(event) => setForm({ ...form, workDate: event.target.value })} />
            <Input type="number" min="0.25" step="0.25" label={t('time.hours')} value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
            <Textarea label={t('time.description')} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div className={page.row}>
                <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>{t('common.save')}</Button>
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
            </div>
        </div>
    );
}
