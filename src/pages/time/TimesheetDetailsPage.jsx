import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatHours, timeApi } from '../../features/time/api/timeApi.js';
import { formatDate, formatDateTime } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useEmployeeLabels, useWorkLabels } from '../../shared/lib/displayNames.js';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { Textarea } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { TimeNav } from './TimeNav.jsx';
import {
    EmployeeCell,
    JournalLink,
    Missing,
    periodLabel,
    ProjectCell,
    TaskCell,
    varianceCopy,
} from './timeDisplay.jsx';
import page from '../../shared/styles/page.module.css';
import styles from './TimePages.module.css';

export function TimesheetDetailsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const selfId = useAuthStore((state) => state.employee?.id);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const [comment, setComment] = useState('');
    const [warnings, setWarnings] = useState([]);
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
        onSuccess: (result) => {
            const list = result?.warnings || [];
            setWarnings(list);
            if (list.length) {
                push({ type: 'info', message: list[0] });
            }
            refresh();
        },
        onError,
    });
    const approve = useMutation({
        mutationFn: () => timeApi.approveTimesheet(id, { expectedVersion: sheet.data.version, comment }),
        onSuccess: refresh,
        onError,
    });
    const reject = useMutation({
        mutationFn: () => timeApi.rejectTimesheet(id, { expectedVersion: sheet.data.version, comment }),
        onSuccess: () => {
            setComment('');
            refresh();
        },
        onError,
    });

    const data = sheet.data;
    const entries = data?.entries || [];
    const labels = useWorkLabels(entries);
    const employeeName = useEmployeeLabels([
        data?.employeeId,
        data?.approvedBy,
        ...(reviews.data || []).map((row) => row.reviewerEmployeeId),
    ]);

    if (sheet.isLoading) {
        return <Skeleton rows={6} />;
    }
    if (sheet.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={sheet.refetch} actionLabel={t('common.retry')} />;
    }

    const own = String(data.employeeId) === String(selfId);
    const canSend = own && (data.status === 'DRAFT' || data.status === 'REJECTED');
    const canDecide = data.status === 'SUBMITTED' && canApproveTimesheets(role) && !own;
    const period = periodLabel(formatDate, data.periodStart, data.periodEnd);
    const variance = varianceCopy(t, data.totalMinutes, data.plannedMinutes);
    const statusHint = {
        SUBMITTED: own ? t('time.waitingHint') : t('time.approvalsSubtitle'),
        APPROVED: t('time.approvedHint'),
        REJECTED: t('time.rejectedHint'),
        DRAFT: t('time.submitHint'),
    }[data.status];

    return (
        <section className={page.sections}>
            <BackLink to="/app/time/timesheets">{t('common.back')}</BackLink>
            <PageHeader
                title={t('time.timesheetTitle', { period })}
                description={statusHint}
                actions={<Badge tone={statusTone('timesheetStatus', data.status)}>{enumLabel(t, 'timesheetStatus', data.status)}</Badge>}
            />
            <TimeNav />
            <Card>
                <h2 className={page.sectionTitle}>{t('time.weekSummary')}</h2>
                <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                        <span>{t('time.employee')}</span>
                        <strong><EmployeeCell id={data.employeeId} name={employeeName(data.employeeId)} /></strong>
                    </div>
                    <div className={styles.metaItem}>
                        <span>{t('time.period')}</span>
                        <strong>{period}</strong>
                    </div>
                    <div className={styles.metaItem}>
                        <span>{t('time.submittedAt')}</span>
                        <strong>{data.submittedAt ? formatDateTime(data.submittedAt) : t('time.notSubmitted')}</strong>
                    </div>
                    <div className={styles.metaItem}>
                        <span>{t('time.approvedAt')}</span>
                        <strong>{data.approvedAt ? formatDateTime(data.approvedAt) : t('time.notApproved')}</strong>
                    </div>
                    <div className={styles.metaItem}>
                        <span>{t('time.approvedBy')}</span>
                        <strong>
                            {data.approvedBy
                                ? <EmployeeCell id={data.approvedBy} name={employeeName(data.approvedBy)} />
                                : t('time.notApproved')}
                        </strong>
                    </div>
                </div>
            </Card>
            <StatRow columns={4}>
                <StatTile label={t('time.norm')} value={formatHours(t, data.plannedMinutes)} />
                <StatTile label={t('time.logged')} value={formatHours(t, data.totalMinutes)} />
                <StatTile label={t('time.variance')} value={variance.text} hint={variance.hint} tone={variance.tone} />
                <StatTile label={t('time.entryCount')} value={entries.length} />
            </StatRow>
            <Card>
                <div className={page.sectionHead}>
                    <h2 className={page.sectionTitle}>{t('time.entries')}</h2>
                    <JournalLink from={data.periodStart} to={data.periodEnd} employeeId={data.employeeId}>
                        {t('time.openJournal')}
                    </JournalLink>
                </div>
                <DataTable
                    rows={entries}
                    empty={t('time.entriesEmpty')}
                    columns={[
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
            </Card>
            {warnings.length ? (
                <Card>
                    <h2 className={page.sectionTitle}>{t('time.warningsTitle')}</h2>
                    <ul className={styles.warnings}>
                        {warnings.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </Card>
            ) : null}
            {canSend || canDecide || (data.status === 'SUBMITTED' && own) ? (
                <Card>
                    <h2 className={page.sectionTitle}>{t('time.actions')}</h2>
                    {canSend ? (
                        <div className={page.stack}>
                            <p className={styles.hint}>{t('time.submitHint')}</p>
                            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{t('time.submit')}</Button>
                        </div>
                    ) : null}
                    {data.status === 'SUBMITTED' && own ? <p className={styles.hint}>{t('time.waitingHint')}</p> : null}
                    {data.status === 'SUBMITTED' && canApproveTimesheets(role) && own ? (
                        <p className={styles.hint}>{t('time.ownSheetHint')}</p>
                    ) : null}
                    {canDecide ? (
                        <div className={page.stack}>
                            <p className={styles.hint}>{t('time.rejectHint')}</p>
                            <Textarea
                                label={t('time.comment')}
                                value={comment}
                                onChange={(event) => setComment(event.target.value)}
                            />
                            <div className={page.row}>
                                <Button onClick={() => approve.mutate()} disabled={approve.isPending}>{t('time.approve')}</Button>
                                <Button
                                    variant="coral"
                                    onClick={() => reject.mutate()}
                                    disabled={!comment.trim() || reject.isPending}
                                >
                                    {t('time.reject')}
                                </Button>
                            </div>
                            {!comment.trim() ? <p className={styles.hint}>{t('time.commentRequired')}</p> : null}
                        </div>
                    ) : null}
                </Card>
            ) : null}
            <Card>
                <h2 className={page.sectionTitle}>{t('time.reviews')}</h2>
                <DataTable
                    rows={reviews.data || []}
                    empty={t('time.reviewsEmpty')}
                    columns={[
                        {
                            key: 'decision',
                            header: t('time.decision'),
                            render: (row) => (
                                <Badge tone={row.decision === 'APPROVE' ? 'success' : 'danger'}>
                                    {enumLabel(t, 'reviewDecision', row.decision)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'reviewer',
                            header: t('time.reviewer'),
                            render: (row) => (
                                <EmployeeCell id={row.reviewerEmployeeId} name={employeeName(row.reviewerEmployeeId)} />
                            ),
                        },
                        {
                            key: 'comment',
                            header: t('time.comment'),
                            wrap: true,
                            render: (row) => row.comment || <Missing>{t('time.commentMissing')}</Missing>,
                        },
                        { key: 'at', header: t('time.date'), render: (row) => formatDateTime(row.reviewedAt) },
                    ]}
                />
            </Card>
        </section>
    );
}
