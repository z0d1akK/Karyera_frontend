import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import page from '../../shared/styles/page.module.css';

function currentWeek() {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const iso = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${dayOfMonth}`;
    };
    return { periodStart: iso(monday), periodEnd: iso(sunday) };
}

export function TimesheetsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employee = useAuthStore((state) => state.employee);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const sheets = useQuery({
        queryKey: ['time', 'timesheets', employee?.id],
        enabled: Boolean(employee?.id),
        queryFn: async () => unwrapPage(await timeApi.listTimesheets({
            employeeId: employee.id,
            page: 0,
            size: 20,
            sortBy: 'periodStart',
            sortDirection: 'DESC',
        })),
    });
    const create = useMutation({
        mutationFn: () => timeApi.createTimesheet(currentWeek()),
        onSuccess: (sheet) => {
            queryClient.invalidateQueries({ queryKey: ['time', 'timesheets'] });
            navigate(`/app/time/timesheets/${sheet.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    return (
        <section className={page.sections}>
            <PageHeader
                title={t('time.timesheets')}
                actions={<Button onClick={() => create.mutate()} disabled={create.isPending}>{t('time.createWeek')}</Button>}
            />
            <TimeNav />
            <Card>
            {sheets.isLoading ? <Skeleton rows={4} /> : null}
            {sheets.isError ? <PageState title={t('errors.loadFailed')} onAction={sheets.refetch} actionLabel={t('common.retry')} /> : null}
            {sheets.data ? (
                <DataTable
                    rows={sheets.data.content || []}
                    onRowClick={(row) => navigate(`/app/time/timesheets/${row.id}`)}
                    columns={[
                        { key: 'period', header: t('time.period'), render: (row) => `${formatDate(row.periodStart)} — ${formatDate(row.periodEnd)}` },
                        { key: 'norm', header: t('time.norm'), render: (row) => hoursLabel(row.plannedMinutes) },
                        { key: 'logged', header: t('time.logged'), render: (row) => hoursLabel(row.totalMinutes) },
                        { key: 'status', header: t('time.status'), render: (row) => <Badge tone={statusTone('timesheetStatus', row.status)}>{enumLabel(t, 'timesheetStatus', row.status)}</Badge> },
                    ]}
                />
            ) : null}
            </Card>
        </section>
    );
}
