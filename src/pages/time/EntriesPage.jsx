import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { hoursLabel, timeApi } from '../../features/time/api/timeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useWorkLabels } from '../../shared/lib/displayNames.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { NamedLink } from '../../shared/ui/NamedLink/NamedLink.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import page from '../../shared/styles/page.module.css';

export function EntriesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employee = useAuthStore((state) => state.employee);
    const [searchParams] = useSearchParams();
    const day = searchParams.get('date') || '';
    const [filters, setFilters] = useState({ workDateFrom: day, workDateTo: day, projectId: '', status: '' });
    const projects = useQuery({
        queryKey: ['projects', 'time-filter'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const entries = useQuery({
        queryKey: ['time', 'entries', employee?.id, filters],
        enabled: Boolean(employee?.id),
        queryFn: async () => unwrapPage(await timeApi.listEntries({
            employeeId: employee.id,
            ...filters,
            page: 0,
            size: 50,
            sortBy: 'workDate',
            sortDirection: 'DESC',
        })),
    });

    const rows = entries.data?.content || [];
    const labels = useWorkLabels(rows);

    return (
        <section className={page.sections}>
            <PageHeader
                title={t('time.journal')}
                actions={<Button onClick={() => navigate('/app/time/entries/new')}>{t('time.newEntry')}</Button>}
            />
            <TimeNav />
            <Card>
            <div className={page.row}>
                <Input type="date" label={t('time.date')} value={filters.workDateFrom} onChange={(event) => setFilters({ ...filters, workDateFrom: event.target.value })} />
                <Input type="date" label={t('time.period')} value={filters.workDateTo} onChange={(event) => setFilters({ ...filters, workDateTo: event.target.value })} />
                <Select label={t('time.project')} value={filters.projectId} onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}>
                    <option value="">{t('common.all')}</option>
                    {(projects.data || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </Select>
                <Select label={t('time.status')} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
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
                    onRowClick={(row) => navigate(`/app/time/entries/${row.id}`)}
                    columns={[
                        { key: 'date', header: t('time.date'), render: (row) => formatDate(row.workDate) },
                        { key: 'project', header: t('time.project'), render: (row) => <NamedLink to={row.projectId ? `/app/projects/${row.projectId}` : null} name={row.projectName || labels.projectName(row.projectId)} /> },
                        { key: 'task', header: t('time.task'), render: (row) => <NamedLink to={row.taskId ? `/app/tasks/${row.taskId}` : null} name={row.taskTitle || labels.taskTitle(row.taskId)} /> },
                        { key: 'hours', header: t('time.hours'), render: (row) => hoursLabel(row.durationMinutes) },
                        { key: 'status', header: t('time.status'), render: (row) => <Badge tone={statusTone('timeEntryStatus', row.status)}>{enumLabel(t, 'timeEntryStatus', row.status)}</Badge> },
                    ]}
                />
            ) : null}
            </Card>
        </section>
    );
}
