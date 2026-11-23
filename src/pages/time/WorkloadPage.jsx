import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { timeApi, formatHours } from '../../features/time/api/timeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { DateChip } from '../../features/analytics/charts/ChartToolbar.jsx';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { getApiError } from '../../shared/api/errors.js';
import { localTodayIso } from '../../shared/lib/format.js';
import { useEmployeeLabels, useWorkLabels } from '../../shared/lib/displayNames.js';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { EmployeeCell, ProjectCell, varianceCopy } from './timeDisplay.jsx';
import { TimeNav } from './TimeNav.jsx';
import page from '../../shared/styles/page.module.css';
import timeStyles from './TimePages.module.css';

function iso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function thisWeek() {
    const now = new Date();
    const weekday = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - weekday + 1);
    return { from: iso(monday), to: localTodayIso() };
}

function thisMonth() {
    const now = new Date();
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: localTodayIso() };
}

function lastMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(from), to: iso(to) };
}

function orderedPeriod(from, to) {
    if (!from || !to) {
        return { start: from || undefined, end: to || undefined };
    }
    return from <= to ? { start: from, end: to } : { start: to, end: from };
}

function rangeKey(range) {
    return `${range.from}|${range.to}`;
}

function Segmented({ value, onChange, options, label }) {
    return (
        <div className={timeStyles.segmented} role="radiogroup" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    className={`${timeStyles.segment} ${value === option.value ? timeStyles.segmentActive : ''}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function minutesOf(row = {}) {
    return Number(row.approvedMinutes || 0)
        + Number(row.pendingMinutes || 0)
        + Number(row.draftMinutes || 0);
}

function sumField(rows, field) {
    return (rows || []).reduce((total, row) => total + Number(row[field] || 0), 0);
}

export function WorkloadPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('employee');
    const [employeeId, setEmployeeId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const { start: periodStart, end: periodEnd } = orderedPeriod(from, to);
    const presets = {
        week: thisWeek(),
        month: thisMonth(),
        last: lastMonth(),
        all: { from: '', to: '' },
    };
    const currentRange = rangeKey({ from, to });
    const activePreset = Object.entries(presets).find(([, range]) => rangeKey(range) === currentRange)?.[0] || '';

    const projects = useQuery({
        queryKey: ['projects', 'workload'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const employee = useQuery({
        queryKey: ['time', 'workload', employeeId, periodStart, periodEnd],
        enabled: tab === 'employee' && Boolean(employeeId),
        queryFn: () => timeApi.employeeWorkload(employeeId, periodStart, periodEnd),
    });
    const project = useQuery({
        queryKey: ['time', 'project-summary', projectId, periodStart, periodEnd],
        enabled: tab === 'project' && Boolean(projectId),
        queryFn: () => timeApi.projectTimeSummary(projectId, periodStart, periodEnd),
    });
    const team = useQuery({
        queryKey: ['time', 'team-workload', periodStart, periodEnd],
        enabled: tab === 'team',
        queryFn: () => timeApi.teamWorkload(periodStart, periodEnd),
    });

    const active = tab === 'employee' ? employee : tab === 'project' ? project : team;
    const waiting = (tab === 'employee' && !employeeId) || (tab === 'project' && !projectId);
    const rows = (tab === 'employee'
        ? (active.data?.projects || [])
        : (active.data?.employees || active.data?.members || []))
        .map((row) => ({ ...row, id: row.employeeId || row.projectId || row.id }));
    const employeeName = useEmployeeLabels(rows.map((row) => row.employeeId || row.id));
    const workLabels = useWorkLabels(rows);
    const planned = Number(active.data?.plannedMinutes || 0) || sumField(rows, 'plannedMinutes');
    const approved = Number(active.data?.approvedMinutes || 0) || sumField(rows, 'approvedMinutes');
    const pending = Number(active.data?.pendingMinutes || 0) || sumField(rows, 'pendingMinutes');
    const draft = Number(active.data?.draftMinutes || 0) || sumField(rows, 'draftMinutes');
    const variance = varianceCopy(t, approved, planned);
    const usedFrom = from || active.data?.periodStart || '';
    const usedTo = to || active.data?.periodEnd || '';
    const applyRange = (next) => {
        setFrom(next.from);
        setTo(next.to);
    };

    const employeeColumns = [
        { key: 'project', header: t('time.project'), render: (row) => <ProjectCell row={row} labels={workLabels} /> },
        { key: 'hours', header: t('time.logged'), align: 'right', nowrap: true, width: '22%', render: (row) => formatHours(t, Number(row.approvedMinutes || 0)) },
    ];
    const memberColumns = [
        {
            key: 'employee',
            header: t('time.employee'),
            render: (row) => (
                <EmployeeCell
                    id={row.employeeId || row.id}
                    name={row.employeeName || row.fullName || employeeName(row.employeeId || row.id)}
                />
            ),
        },
        { key: 'logged', header: t('time.logged'), align: 'right', nowrap: true, width: '16%', render: (row) => formatHours(t, Number(row.approvedMinutes || 0)) },
        { key: 'pending', header: t('enums.timesheetStatus.SUBMITTED'), align: 'right', nowrap: true, width: '16%', render: (row) => formatHours(t, Number(row.pendingMinutes || 0)) },
        tab === 'team'
            ? { key: 'planned', header: t('time.planned'), align: 'right', nowrap: true, width: '16%', render: (row) => formatHours(t, Number(row.plannedMinutes || 0)) }
            : { key: 'draft', header: t('enums.timesheetStatus.DRAFT'), align: 'right', nowrap: true, width: '16%', render: (row) => formatHours(t, Number(row.draftMinutes || 0)) },
    ];

    return (
        <section className={page.sections}>
            <div className={page.pageHead}>
                <PageHeader title={t('time.workload')} description={t('time.workloadHint')} />
                <TimeNav />
            </div>
            <Card className={timeStyles.workloadCard}>
                <div className={timeStyles.filterBar}>
                    <Segmented
                        label={t('time.workload')}
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'employee', label: t('time.employee') },
                            { value: 'project', label: t('time.project') },
                            { value: 'team', label: t('time.team') },
                        ]}
                    />
                    <Segmented
                        label={t('time.period')}
                        value={activePreset}
                        onChange={(value) => applyRange(presets[value])}
                        options={[
                            { value: 'week', label: t('time.thisWeek') },
                            { value: 'month', label: t('time.thisMonth') },
                            { value: 'last', label: t('time.lastMonth') },
                            { value: 'all', label: t('time.allPeriod') },
                        ]}
                    />
                    <div className={timeStyles.datePair}>
                        <div className={timeStyles.dateField}>
                            <DateChip
                                label={t('time.dateFrom')}
                                value={from || usedFrom}
                                emptyLabel={t('time.dateOpen')}
                                allowClear={Boolean(from)}
                                onChange={setFrom}
                            />
                        </div>
                        <span className={timeStyles.dateSep}>—</span>
                        <div className={timeStyles.dateField}>
                            <DateChip
                                label={t('time.dateTo')}
                                value={to || usedTo}
                                emptyLabel={t('time.dateOpen')}
                                allowClear={Boolean(to)}
                                onChange={setTo}
                            />
                        </div>
                    </div>
                    {tab === 'employee' ? (
                        <div className={timeStyles.picker}>
                            <EmployeePicker searchable label={t('time.employee')} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
                        </div>
                    ) : null}
                    {tab === 'project' ? (
                        <Select label={t('time.project')} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                            <option value="">{t('common.select')}</option>
                            {(projects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                    ) : null}
                </div>
                {waiting ? (
                    <p className={timeStyles.hint}>{tab === 'employee' ? t('time.pickEmployeeWorkload') : t('time.pickProjectWorkload')}</p>
                ) : null}
                {!waiting && active.isLoading ? <Skeleton rows={4} /> : null}
                {!waiting && active.isError ? (
                    <PageState title={getApiError(active.error).message} actionLabel={t('common.retry')} onAction={() => active.refetch()} />
                ) : null}
                {!waiting && active.data ? (
                    <>
                        <div className={timeStyles.metaGrid}>
                            <div className={timeStyles.metaItem}>
                                <span>{t('time.logged')}</span>
                                <strong>{formatHours(t, approved)}</strong>
                            </div>
                            <div className={timeStyles.metaItem}>
                                <span>{t('time.planned')}</span>
                                <strong>{formatHours(t, planned)} <em className={timeStyles.missing}>{variance.hint}</em></strong>
                            </div>
                            <div className={timeStyles.metaItem}>
                                <span>{t('enums.timesheetStatus.SUBMITTED')}</span>
                                <strong>{formatHours(t, pending)}</strong>
                            </div>
                            {tab !== 'employee' ? (
                                <div className={timeStyles.metaItem}>
                                    <span>{t('enums.timesheetStatus.DRAFT')}</span>
                                    <strong>{formatHours(t, draft)}</strong>
                                </div>
                            ) : null}
                        </div>
                        <DataTable
                            empty={t('time.workloadEmpty')}
                            rows={[...rows].sort((a, b) => minutesOf(b) - minutesOf(a))}
                            columns={tab === 'employee' ? employeeColumns : memberColumns}
                        />
                    </>
                ) : null}
            </Card>
        </section>
    );
}
