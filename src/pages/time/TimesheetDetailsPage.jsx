import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useEmployeeNames, useWorkLabels } from '../../shared/lib/displayNames.js';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { NamedLink } from '../../shared/ui/NamedLink/NamedLink.jsx';
import { Textarea } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import page from '../../shared/styles/page.module.css';

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
    const labels = useWorkLabels(sheet.data?.entries || []);
    const employeeName = useEmployeeNames();

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
        <section className={page.sections}>
            <BackLink to="/app/time/timesheets">{t('common.back')}</BackLink>
            <PageHeader
                title={`${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}`}
                description={employeeName(data.employeeId) || undefined}
                actions={<Badge tone={statusTone('timesheetStatus', data.status)}>{enumLabel(t, 'timesheetStatus', data.status)}</Badge>}
            />
            <TimeNav />
            <StatRow>
                <StatTile label={t('time.norm')} value={hoursLabel(data.plannedMinutes)} />
                <StatTile label={t('time.logged')} value={hoursLabel(data.totalMinutes)} />
            </StatRow>
            <Card>
            <DataTable
                rows={data.entries || []}
                columns={[
                    { key: 'date', header: t('time.date'), render: (row) => formatDate(row.workDate) },
                    { key: 'project', header: t('time.project'), render: (row) => <NamedLink to={row.projectId ? `/app/projects/${row.projectId}` : null} name={row.projectName || labels.projectName(row.projectId)} /> },
                    { key: 'task', header: t('time.task'), render: (row) => <NamedLink to={row.taskId ? `/app/tasks/${row.taskId}` : null} name={row.taskTitle || labels.taskTitle(row.taskId)} /> },
                    { key: 'hours', header: t('time.hours'), render: (row) => hoursLabel(row.durationMinutes) },
                ]}
            />
            {canSend ? <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{t('time.submit')}</Button> : null}
            {canDecide ? (
                <div className={page.stack}>
                    <Textarea label={t('time.comment')} value={comment} onChange={(event) => setComment(event.target.value)} />
                    <div className={page.row}>
                        <Button onClick={() => approve.mutate()} disabled={approve.isPending}>{t('time.approve')}</Button>
                        <Button variant="coral" onClick={() => reject.mutate()} disabled={!comment || reject.isPending}>{t('time.reject')}</Button>
                    </div>
                </div>
            ) : null}
            </Card>
            <Card>
            <h2 className={page.sectionTitle}>{t('time.reviews')}</h2>
            <DataTable
                rows={reviews.data || []}
                columns={[
                    { key: 'decision', header: t('time.status'), render: (row) => <Badge tone={row.decision === 'APPROVE' ? 'success' : 'danger'}>{enumLabel(t, 'reviewDecision', row.decision)}</Badge> },
                    { key: 'comment', header: t('time.comment'), render: (row) => row.comment || '—' },
                    { key: 'at', header: t('time.date'), render: (row) => formatDate(row.reviewedAt) },
                ]}
            />
            </Card>
        </section>
    );
}
