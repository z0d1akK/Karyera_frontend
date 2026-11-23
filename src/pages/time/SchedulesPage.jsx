import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { timeApi } from '../../features/time/api/timeApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { canManageWorkSchedules } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { TimeNav } from './TimeNav.jsx';
import page from '../../shared/styles/page.module.css';

const empty = {
    code: '',
    name: '',
    description: '',
    timezone: 'Europe/Minsk',
    active: true,
};

export function SchedulesPage() {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const canManage = canManageWorkSchedules(role);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState(null);
    const [assign, setAssign] = useState({ employeeId: '', scheduleId: '', validFrom: '', validTo: '' });

    const list = useQuery({
        queryKey: ['time', 'schedules'],
        queryFn: async () => unwrapPage(await timeApi.listSchedules({ page: 0, size: 100, sortBy: 'name' })),
    });
    const rows = list.data?.content || [];
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const save = useMutation({
        mutationFn: () => (editingId
            ? timeApi.updateSchedule(editingId, form)
            : timeApi.createSchedule(form)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time', 'schedules'] });
            setOpen(false);
            setEditingId(null);
            push({ type: 'success', message: t('common.saved') });
        },
        onError,
    });
    const assignMut = useMutation({
        mutationFn: () => timeApi.assignSchedule(assign.employeeId, {
            scheduleId: assign.scheduleId,
            validFrom: assign.validFrom,
            validTo: assign.validTo || null,
        }),
        onSuccess: () => {
            push({ type: 'success', message: t('common.saved') });
            setAssign({ employeeId: '', scheduleId: '', validFrom: '', validTo: '' });
        },
        onError,
    });
    const history = useQuery({
        queryKey: ['time', 'schedules', 'employee', assign.employeeId],
        enabled: Boolean(assign.employeeId),
        queryFn: () => timeApi.employeeSchedules(assign.employeeId),
    });

    if (list.isLoading) {
        return <Skeleton rows={6} />;
    }
    if (list.isError) {
        return <PageState title={getApiError(list.error).message} actionLabel={t('common.retry')} onAction={() => list.refetch()} />;
    }

    return (
        <section className={page.sections}>
            <PageHeader
                title={t('time.schedules')}
                description={t('time.schedulesHint')}
                actions={canManage ? (
                    <Button onClick={() => { setEditingId(null); setForm(empty); setOpen(true); }}>{t('common.create')}</Button>
                ) : null}
            />
            <TimeNav />
            <Card>
                <DataTable
                    columns={[
                        { key: 'code', header: t('form.code'), render: (row) => row.code },
                        { key: 'name', header: t('form.name'), render: (row) => row.name },
                        { key: 'timezone', header: t('time.timezone'), render: (row) => row.timezone },
                        ...(canManage ? [{
                            key: 'actions',
                            header: t('common.actions'),
                            render: (row) => (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingId(row.id);
                                        setForm({
                                            code: row.code || '',
                                            name: row.name || '',
                                            description: row.description || '',
                                            timezone: row.timezone || 'Europe/Minsk',
                                            active: row.active !== false,
                                        });
                                        setOpen(true);
                                    }}
                                >
                                    {t('common.edit')}
                                </Button>
                            ),
                        }] : []),
                    ]}
                    rows={rows}
                />
            </Card>
            {canManage ? (
                <Card>
                    <h2 className={page.sectionTitle}>{t('time.assignSchedule')}</h2>
                    <div className={page.stack}>
                        <EmployeePicker searchable label={t('time.employee')} value={assign.employeeId} onChange={(e) => setAssign({ ...assign, employeeId: e.target.value })} />
                        <Select label={t('time.schedules')} value={assign.scheduleId} onChange={(e) => setAssign({ ...assign, scheduleId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                        </Select>
                        <Input type="date" label={t('time.validFrom')} value={assign.validFrom} onChange={(e) => setAssign({ ...assign, validFrom: e.target.value })} />
                        <Input type="date" label={t('time.validTo')} value={assign.validTo} onChange={(e) => setAssign({ ...assign, validTo: e.target.value })} />
                        <Button onClick={() => assignMut.mutate()} disabled={!assign.employeeId || !assign.scheduleId || !assign.validFrom}>{t('time.assign')}</Button>
                        {(history.data || []).map((row) => (
                            <p key={row.id}>{row.scheduleName || row.scheduleId} · {row.validFrom} — {row.validTo || '—'}</p>
                        ))}
                    </div>
                </Card>
            ) : null}
            <Modal open={open} title={editingId ? t('common.edit') : t('time.newSchedule')} onClose={() => setOpen(false)}>
                <div className={page.stack}>
                    <Input label={t('form.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <Input label={t('form.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Input label={t('time.timezone')} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                    <Textarea label={t('form.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <Button onClick={() => save.mutate()}>{t('common.save')}</Button>
                </div>
            </Modal>
        </section>
    );
}
