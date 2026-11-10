import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';

export function ApprovalsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const pending = useQuery({
        queryKey: ['time', 'pending'],
        queryFn: () => timeApi.pendingApproval(),
    });

    return (
        <section>
            <PageHeader title={t('time.approvals')} />
            <TimeNav />
            {pending.isLoading ? <Skeleton rows={4} /> : null}
            {pending.isError ? <PageState title={t('errors.loadFailed')} onAction={pending.refetch} actionLabel={t('common.retry')} /> : null}
            {pending.data ? (
                <DataTable
                    rows={pending.data}
                    onRowClick={(row) => navigate(`/app/time/timesheets/${row.id}`)}
                    columns={[
                        { key: 'employee', header: t('analyticsUi.employees'), render: (row) => row.employeeId },
                        { key: 'period', header: t('time.period'), render: (row) => `${formatDate(row.periodStart)} — ${formatDate(row.periodEnd)}` },
                        { key: 'logged', header: t('time.logged'), render: (row) => hoursLabel(row.totalMinutes) },
                        { key: 'status', header: t('time.status'), render: (row) => <Badge tone={statusTone('timesheetStatus', row.status)}>{enumLabel(t, 'timesheetStatus', row.status)}</Badge> },
                    ]}
                />
            ) : null}
        </section>
    );
}
