import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { Textarea } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';

export function TimesheetDetailsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const [comment, setComment] = useState('');
    const sheet = useQuery({
        queryKey: ['time', 'timesheet', id],
        queryFn: () => timeApi.getTimesheet(id),
    });
    const reviews = useQuery({
        queryKey: ['time', 'reviews', id],
        queryFn: () => timeApi.reviews(id),
    });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['time'] });
    };
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const submit = useMutation({
        mutationFn: () => timeApi.submitTimesheet(id, { expectedVersion: sheet.data.version }),
        onSuccess: refresh,
        onError,
    });
    const approve = useMutation({
        mutationFn: () => timeApi.approveTimesheet(id, { expectedVersion: sheet.data.version, comment }),
        onSuccess: refresh,
        onError,
    });
    const reject = useMutation({
        mutationFn: () => timeApi.rejectTimesheet(id, { expectedVersion: sheet.data.version, comment }),
        onSuccess: refresh,
        onError,
    });

    if (sheet.isLoading) {
        return <Skeleton rows={6} />;
    }
    if (sheet.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={sheet.refetch} actionLabel={t('common.retry')} />;
    }

    const data = sheet.data;
    const canSend = data.status === 'DRAFT' || data.status === 'REJECTED';
    const canDecide = data.status === 'SUBMITTED' && canApproveTimesheets(role);

    return (
        <section>
            <PageHeader
                title={`${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}`}
                actions={<Badge tone={statusTone('timesheetStatus', data.status)}>{enumLabel(t, 'timesheetStatus', data.status)}</Badge>}
            />
            <TimeNav />
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <StatTile label={t('time.norm')} value={hoursLabel(data.plannedMinutes)} />
                <StatTile label={t('time.logged')} value={hoursLabel(data.totalMinutes)} />
            </div>
            <DataTable
                rows={data.entries || []}
                columns={[
                    { key: 'date', header: t('time.date'), render: (row) => formatDate(row.workDate) },
                    { key: 'project', header: t('time.project'), render: (row) => row.projectName || row.projectId },
                    { key: 'task', header: t('time.task'), render: (row) => row.taskTitle || row.taskId },
                    { key: 'hours', header: t('time.hours'), render: (row) => hoursLabel(row.durationMinutes) },
                ]}
            />
            {canSend ? <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{t('time.submit')}</Button> : null}
            {canDecide ? (
                <div style={{ maxWidth: 560, marginTop: 16, display: 'grid', gap: 12 }}>
                    <Textarea label={t('time.comment')} value={comment} onChange={(event) => setComment(event.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={() => approve.mutate()} disabled={approve.isPending}>{t('time.approve')}</Button>
                        <Button variant="coral" onClick={() => reject.mutate()} disabled={!comment || reject.isPending}>{t('time.reject')}</Button>
                    </div>
                </div>
            ) : null}
            <h2 style={{ marginTop: 24 }}>{t('time.reviews')}</h2>
            <DataTable
                rows={reviews.data || []}
                columns={[
                    { key: 'decision', header: t('time.status'), render: (row) => row.decision },
                    { key: 'comment', header: t('time.comment'), render: (row) => row.comment || '—' },
                    { key: 'at', header: t('time.date'), render: (row) => formatDate(row.reviewedAt) },
                ]}
            />
        </section>
    );
}
