import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { formatHours, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate, formatDateTime } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useEmployeeLabels } from '../../shared/lib/displayNames.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import { EmployeeCell, periodLabel, varianceCopy } from './timeDisplay.jsx';
import page from '../../shared/styles/page.module.css';

export function ApprovalsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const pending = useQuery({
        queryKey: ['time', 'pending'],
        queryFn: () => timeApi.pendingApproval(),
    });
    const rows = pending.data || [];
    const employeeName = useEmployeeLabels(rows.map((row) => row.employeeId));

    return (
        <section className={page.sections}>
            <PageHeader title={t('time.approvals')} description={t('time.approvalsSubtitle')} />
            <TimeNav />
            <Card>
                {pending.isLoading ? <Skeleton rows={4} /> : null}
                {pending.isError ? (
                    <PageState title={t('errors.loadFailed')} onAction={pending.refetch} actionLabel={t('common.retry')} />
                ) : null}
                {!pending.isLoading && !pending.isError ? (
                    <DataTable
                        rows={rows}
                        empty={t('time.approvalsEmpty')}
                        onRowClick={(row) => navigate(`/app/time/timesheets/${row.id}`)}
                        columns={[
                            {
                                key: 'employee',
                                header: t('time.employee'),
                                render: (row) => <EmployeeCell id={row.employeeId} name={employeeName(row.employeeId)} />,
                            },
                            {
                                key: 'period',
                                header: t('time.period'),
                                render: (row) => periodLabel(formatDate, row.periodStart, row.periodEnd),
                            },
                            { key: 'norm', header: t('time.norm'), render: (row) => formatHours(t, row.plannedMinutes) },
                            { key: 'logged', header: t('time.logged'), render: (row) => formatHours(t, row.totalMinutes) },
                            {
                                key: 'variance',
                                header: t('time.variance'),
                                render: (row) => {
                                    const copy = varianceCopy(t, row.totalMinutes, row.plannedMinutes);
                                    return `${copy.text} (${copy.hint})`;
                                },
                            },
                            {
                                key: 'submittedAt',
                                header: t('time.submittedAt'),
                                render: (row) => (row.submittedAt ? formatDateTime(row.submittedAt) : t('time.notSubmitted')),
                            },
                            {
                                key: 'status',
                                header: t('time.status'),
                                render: (row) => (
                                    <Badge tone={statusTone('timesheetStatus', row.status)}>
                                        {enumLabel(t, 'timesheetStatus', row.status)}
                                    </Badge>
                                ),
                            },
                        ]}
                    />
                ) : null}
            </Card>
        </section>
    );
}
