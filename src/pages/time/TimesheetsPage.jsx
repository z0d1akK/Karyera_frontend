import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatHours, timeApi } from '../../features/time/api/timeApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { DateChip } from '../../features/analytics/charts/ChartToolbar.jsx';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { useEmployeeLabels } from '../../shared/lib/displayNames.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { PageSizeField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import timeStyles from './TimePages.module.css';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { TimeNav } from './TimeNav.jsx';
import { EmployeeCell, periodLabel, varianceCopy } from './timeDisplay.jsx';
import page from '../../shared/styles/page.module.css';

const ALL = '__all__';

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
    const role = useAuthStore((state) => state.session?.role);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const canReview = canApproveTimesheets(role);
    const [filters, setFilters] = useState({
        employeeId: canReview ? ALL : (employee?.id || ''),
        status: '',
        periodStartFrom: '',
        periodStartTo: '',
        page: 0,
        size: 20,
    });

    const employeeId = canReview
        ? (filters.employeeId === ALL ? undefined : filters.employeeId)
        : employee?.id;

    const sheets = useQuery({
        queryKey: ['time', 'timesheets', employeeId, filters.status, filters.periodStartFrom, filters.periodStartTo, filters.page, filters.size],
        enabled: canReview || Boolean(employee?.id),
        queryFn: async () => unwrapPage(await timeApi.listTimesheets({
            employeeId,
            status: filters.status || undefined,
            periodStartFrom: filters.periodStartFrom || undefined,
            periodStartTo: filters.periodStartTo || undefined,
            page: filters.page,
            size: filters.size,
            sortBy: 'periodStart',
            sortDirection: 'DESC',
        })),
    });
    const pending = useQuery({
        queryKey: ['time', 'pending'],
        enabled: canReview,
        queryFn: () => timeApi.pendingApproval(),
    });
    const create = useMutation({
        mutationFn: () => timeApi.createTimesheet(currentWeek()),
        onSuccess: (sheet) => {
            queryClient.invalidateQueries({ queryKey: ['time', 'timesheets'] });
            navigate(`/app/time/timesheets/${sheet.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const rows = sheets.data?.content || [];
    const employeeName = useEmployeeLabels(rows.map((row) => row.employeeId));
    const submitted = rows.filter((row) => row.status === 'SUBMITTED').length;
    const approved = rows.filter((row) => row.status === 'APPROVED').length;
    const extraOptions = [
        ...(canReview ? [{ id: ALL, label: t('time.allEmployees') }] : []),
        ...(employee?.id ? [{ id: employee.id, label: t('time.myTimesheets') }] : []),
    ];

    return (
        <section className={page.sections}>
            <div className={page.pageHead}>
                <PageHeader
                    title={t('time.timesheets')}
                    description={canReview ? t('time.managerSubtitle') : t('time.employeeSubtitle')}
                    actions={<Button onClick={() => create.mutate()} disabled={create.isPending}>{t('time.createWeek')}</Button>}
                />
                <TimeNav />
            </div>
            <StatRow columns={3}>
                <StatTile label={t('common.shownOf', { shown: rows.length, total: sheets.data?.totalElements ?? 0 })} value={sheets.data?.totalElements ?? 0} />
                <StatTile label={t('time.pendingCount')} value={canReview ? (pending.data?.length ?? 0) : submitted} tone="accent" />
                <StatTile label={enumLabel(t, 'timesheetStatus', 'APPROVED')} value={approved} tone="success" />
            </StatRow>
            <Card>
                {canReview ? (
                    <div className={timeStyles.filterBar}>
                        <EmployeePicker
                            searchable
                            label={t('time.employee')}
                            value={filters.employeeId}
                            extraOptions={extraOptions}
                            onChange={(event) => setFilters({ ...filters, employeeId: event.target.value, page: 0 })}
                        />
                        <Select
                            label={t('time.status')}
                            value={filters.status}
                            onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 0 })}
                        >
                            <option value="">{t('common.all')}</option>
                            {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((status) => (
                                <option key={status} value={status}>{enumLabel(t, 'timesheetStatus', status)}</option>
                            ))}
                        </Select>
                        <DateChip
                            label={t('time.periodFrom')}
                            value={filters.periodStartFrom}
                            onChange={(periodStartFrom) => setFilters({ ...filters, periodStartFrom, page: 0 })}
                        />
                        <DateChip
                            label={t('time.periodTo')}
                            value={filters.periodStartTo}
                            onChange={(periodStartTo) => setFilters({ ...filters, periodStartTo, page: 0 })}
                        />
                        <PageSizeField value={filters.size} onChange={(size) => setFilters({ ...filters, size, page: 0 })} />
                    </div>
                ) : null}
                {sheets.isLoading ? <Skeleton rows={4} /> : null}
                {sheets.isError ? <PageState title={t('errors.loadFailed')} onAction={sheets.refetch} actionLabel={t('common.retry')} /> : null}
                {sheets.data ? (
                    <>
                        <DataTable
                            rows={rows}
                            empty={canReview ? t('time.teamTimesheetsEmpty') : t('time.timesheetsEmpty')}
                            onRowClick={(row) => navigate(`/app/time/timesheets/${row.id}`)}
                            columns={[
                                ...(canReview ? [{
                                    key: 'employee',
                                    header: t('time.employee'),
                                    render: (row) => <EmployeeCell id={row.employeeId} name={employeeName(row.employeeId)} />,
                                }] : []),
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
                        <Pagination
                            page={filters.page}
                            totalPages={sheets.data.totalPages}
                            onChange={(next) => setFilters({ ...filters, page: next })}
                        />
                    </>
                ) : null}
            </Card>
        </section>
    );
}
