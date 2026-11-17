import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { formatHours, timeApi } from '../../features/time/api/timeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useEmployeeLabels, useWorkLabels } from '../../shared/lib/displayNames.js';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { TimeNav } from './TimeNav.jsx';
import { TimeEntryForm } from './TimeEntryForm.jsx';
import { EmployeeCell, Missing, ProjectCell, TaskCell } from './timeDisplay.jsx';
import page from '../../shared/styles/page.module.css';

const ALL = '__all__';

export function EntriesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employee = useAuthStore((state) => state.employee);
    const role = useAuthStore((state) => state.session?.role);
    const canReview = canApproveTimesheets(role);
    const [searchParams] = useSearchParams();
    const day = searchParams.get('date') || '';
    const initialEmployee = searchParams.get('employeeId') || (canReview ? ALL : (employee?.id || ''));
    const [filters, setFilters] = useState({
        workDateFrom: searchParams.get('dateFrom') || day,
        workDateTo: searchParams.get('dateTo') || day,
        projectId: '',
        status: '',
        employeeId: initialEmployee,
    });
    const [createOpen, setCreateOpen] = useState(false);
    const employeeId = canReview
        ? (filters.employeeId === ALL ? undefined : filters.employeeId)
        : employee?.id;
    const projects = useQuery({
        queryKey: ['projects', 'time-filter'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const entries = useQuery({
        queryKey: ['time', 'entries', employeeId, filters.workDateFrom, filters.workDateTo, filters.projectId, filters.status],
        enabled: canReview || Boolean(employee?.id),
        queryFn: async () => unwrapPage(await timeApi.listEntries({
            employeeId,
            workDateFrom: filters.workDateFrom || undefined,
            workDateTo: filters.workDateTo || undefined,
            projectId: filters.projectId || undefined,
            status: filters.status || undefined,
            page: 0,
            size: 50,
            sortBy: 'workDate',
            sortDirection: 'DESC',
        })),
    });

    const rows = entries.data?.content || [];
    const labels = useWorkLabels(rows);
    const employeeName = useEmployeeLabels(rows.map((row) => row.employeeId));
    const ownView = !employeeId || String(employeeId) === String(employee?.id);
    const extraOptions = [
        ...(canReview ? [{ id: ALL, label: t('time.allEmployees') }] : []),
        ...(employee?.id ? [{ id: employee.id, label: t('time.myJournal') }] : []),
    ];

    return (
        <section className={page.sections}>
            <PageHeader
                title={t('time.journal')}
                description={t('time.journalSubtitle')}
                actions={ownView ? <Button onClick={() => setCreateOpen(true)}>{t('time.newEntry')}</Button> : null}
            />
            <TimeNav />
            <Card>
                <div className={page.row}>
                    {canReview ? (
                        <EmployeePicker
                            searchable
                            label={t('time.employee')}
                            value={filters.employeeId}
                            extraOptions={extraOptions}
                            onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}
                        />
                    ) : null}
                    <Input
                        type="date"
                        label={t('time.dateFrom')}
                        value={filters.workDateFrom}
                        onChange={(event) => setFilters({ ...filters, workDateFrom: event.target.value })}
                    />
                    <Input
                        type="date"
                        label={t('time.dateTo')}
                        value={filters.workDateTo}
                        onChange={(event) => setFilters({ ...filters, workDateTo: event.target.value })}
                    />
                    <Select
                        label={t('time.project')}
                        value={filters.projectId}
                        onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}
                    >
                        <option value="">{t('common.all')}</option>
                        {(projects.data || []).map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </Select>
                    <Select
                        label={t('time.status')}
                        value={filters.status}
                        onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                    >
                        <option value="">{t('common.all')}</option>
                        {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'VOIDED'].map((status) => (
                            <option key={status} value={status}>{enumLabel(t, 'timeEntryStatus', status)}</option>
                        ))}
                    </Select>
                </div>
                {entries.isLoading ? <Skeleton rows={4} /> : null}
                {entries.isError ? <PageState title={t('errors.loadFailed')} onAction={entries.refetch} actionLabel={t('common.retry')} /> : null}
                {entries.data ? (
                    <DataTable
                        rows={rows}
                        empty={t('time.journalEmpty')}
                        onRowClick={(row) => navigate(`/app/time/entries/${row.id}`)}
                        columns={[
                            ...(canReview ? [{
                                key: 'employee',
                                header: t('time.employee'),
                                render: (row) => <EmployeeCell id={row.employeeId} name={employeeName(row.employeeId)} />,
                            }] : []),
                            { key: 'date', header: t('time.date'), render: (row) => formatDate(row.workDate) },
                            { key: 'project', header: t('time.project'), render: (row) => <ProjectCell row={row} labels={labels} /> },
                            { key: 'task', header: t('time.task'), render: (row) => <TaskCell row={row} labels={labels} /> },
                            { key: 'hours', header: t('time.hours'), render: (row) => formatHours(t, row.durationMinutes) },
                            {
                                key: 'description',
                                header: t('time.description'),
                                wrap: true,
                                render: (row) => row.description || <Missing>{t('time.descriptionMissing')}</Missing>,
                            },
                            {
                                key: 'status',
                                header: t('time.status'),
                                render: (row) => (
                                    <Badge tone={statusTone('timeEntryStatus', row.status)}>
                                        {enumLabel(t, 'timeEntryStatus', row.status)}
                                    </Badge>
                                ),
                            },
                        ]}
                    />
                ) : null}
            </Card>
            <Modal open={createOpen} title={t('time.newEntry')} onClose={() => setCreateOpen(false)}>
                <TimeEntryForm
                    initialDate={filters.workDateFrom || filters.workDateTo || ''}
                    onCancel={() => setCreateOpen(false)}
                    onSaved={() => setCreateOpen(false)}
                />
            </Modal>
        </section>
    );
}
