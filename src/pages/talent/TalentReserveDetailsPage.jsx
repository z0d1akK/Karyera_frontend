import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate, formatScorePercent } from '../../shared/lib/format.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { useEmployeeNames } from '../../shared/lib/displayNames.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageTalent } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { Alert } from '../../shared/ui/Alert/Alert.jsx';
import { Input } from '../../shared/ui/Input/Input.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import styles from '../../shared/styles/catalog.module.css';
import { decisionTypes } from './candidateDecisions.js';

function sortScreeningResults(rows = []) {
    return [...rows].sort((left, right) => {
        if ((left.rank == null) !== (right.rank == null)) {
            return left.rank == null ? 1 : -1;
        }
        if (left.rank != null && right.rank != null && left.rank !== right.rank) {
            return left.rank - right.rank;
        }
        return Number(right.score || 0) - Number(left.score || 0);
    });
}

function CompositionTable({ title, counts, labelHeader, countHeader }) {
    const rows = Object.entries(counts || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([name, count]) => ({ name, count }));
    if (!rows.length) {
        return null;
    }
    return (
        <>
            <h3 className={page.sectionTitle}>{title}</h3>
            <DataTable
                rows={rows.map((row) => ({ ...row, id: row.name }))}
                columns={[
                    { key: 'name', header: labelHeader, width: '72%' },
                    { key: 'count', header: countHeader, align: 'right', nowrap: true, width: '28%' },
                ]}
            />
        </>
    );
}

export function TalentReserveDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.session?.role);
    const catalogs = useCatalogs();
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [nomination, setNomination] = useState({ employeeId: '', comment: '' });
    const [edit, setEdit] = useState(null);
    const [nominationOpen, setNominationOpen] = useState(false);
    const [screeningError, setScreeningError] = useState('');
    const [screeningJob, setScreeningJob] = useState(null);
    const [selectedScreening, setSelectedScreening] = useState([]);
    const [decideFor, setDecideFor] = useState(null);
    const [decision, setDecision] = useState({ decision: 'APPROVE', comment: '' });
    const employeeName = useEmployeeNames();
    const manageTalent = canManageTalent(role);

    const reserve = useQuery({ queryKey: queryKeys.career.reserve(id), queryFn: () => careerApi.getReserve(id) });
    const [candidateQuery, setCandidateQuery] = useState({ page: 0, size: 20, sortBy: 'nominatedAt', sortDirection: 'DESC' });
    const candidates = useQuery({
        queryKey: [...queryKeys.career.candidates(id), candidateQuery],
        queryFn: async () => unwrapPage(await careerApi.listCandidates(id, candidateQuery)),
    });

    const invalidateReserve = (data) => {
        if (data && String(data.id) === String(id) && data.name != null) {
            queryClient.setQueryData(queryKeys.career.reserve(id), data);
        }
        queryClient.invalidateQueries({ queryKey: ['career', 'reserves'] });
        queryClient.invalidateQueries({ queryKey: ['talent-analysis', id] });
        queryClient.invalidateQueries({ queryKey: ['talent-screening', id] });
    };

    const nominate = useMutation({
        mutationFn: () => careerApi.nominate(id, nomination),
        onSuccess: () => {
            setNominationOpen(false);
            invalidateReserve();
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const includeScreening = useMutation({
        mutationFn: () => careerApi.includeScreening(id, selectedScreening),
        onSuccess: (data) => {
            setSelectedScreening([]);
            invalidateReserve();
            push({ type: 'success', message: t('talent.included', { count: data.included }) });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const decide = useMutation({
        mutationFn: () => careerApi.decide(decideFor.id, {
            ...decision,
            expectedVersion: decideFor.version,
        }),
        onSuccess: () => {
            setDecideFor(null);
            setDecision({ decision: 'APPROVE', comment: '' });
            invalidateReserve();
            push({ type: 'success', message: t('talent.decisionSaved') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const screeningJobId = screeningJob?.jobId || reserve.data?.lastScreeningJobId;
    const screeningResults = useQuery({
        queryKey: ['talent-screening', id, screeningJobId],
        enabled: Boolean(screeningJobId),
        refetchInterval: (query) => (query.state.data?.status === 'COMPLETED' || query.state.data?.status === 'FAILED' ? false : 2000),
        queryFn: () => careerApi.getScreening(id, screeningJobId),
    });
    const analyticScreenings = useQuery({
        queryKey: ['analytics', 'talent-screenings', id],
        queryFn: async () => unwrapPage(await analyticsApi.listScreenings({ page: 0, size: 50 })),
        retry: false,
    });
    const screening = useMutation({
        mutationFn: () => careerApi.startScreening(id),
        onSuccess: (data) => {
            setScreeningError('');
            setScreeningJob(data);
            invalidateReserve();
            push({ type: 'success', message: t('talent.screeningStarted') });
        },
        onError: (error) => {
            const parsed = getApiError(error);
            setScreeningError(parsed.message || t('talent.analysisFailed'));
            push({ type: 'error', message: parsed.message });
        },
    });
    const analysis = useQuery({
        queryKey: ['talent-analysis', id],
        queryFn: () => careerApi.getAnalysis(id),
        retry: false,
    });
    const activate = useMutation({
        mutationFn: () => careerApi.activateReserve(id, { expectedVersion: reserve.data?.version }),
        onSuccess: invalidateReserve,
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const close = useMutation({
        mutationFn: () => careerApi.closeReserve(id, { expectedVersion: reserve.data?.version }),
        onSuccess: invalidateReserve,
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const save = useMutation({
        mutationFn: () => careerApi.updateReserve(id, Object.fromEntries(Object.entries(edit).filter(([, value]) => value !== ''))),
        onSuccess: (data) => {
            setEdit(null);
            invalidateReserve(data);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (reserve.isLoading) {
        return <Skeleton />;
    }

    if (reserve.isError || !reserve.data) {
        return <PageState title={getApiError(reserve.error).message} actionLabel={t('common.retry')} onAction={() => reserve.refetch()} />;
    }

    const data = reserve.data;

    return (
        <section>
            <BackLink to="/app/talent-reserve">{t('talent.back')}</BackLink>
            <PageHeader title={data.name} actions={<Badge>{enumLabel(t, 'reserveStatus', data.status)}</Badge>} />
            <Card>
                <p>{data.description}</p>
                {canManageTalent(role) ? (
                    <div className={page.actionsBar}>
                        <div className={page.row}>
                            {data.status === 'ACTIVE' ? <Button onClick={() => setNominationOpen(true)}>{t('talent.nominate')}</Button> : null}
                            {data.status === 'DRAFT' ? <Button onClick={() => activate.mutate()}>{t('talent.activate')}</Button> : null}
                            {data.status === 'ACTIVE' ? (
                                <Button onClick={() => screening.mutate()} disabled={screening.isPending}>
                                    {t('talent.screening')}
                                </Button>
                            ) : null}
                            {data.status !== 'CLOSED' && data.status !== 'ARCHIVED' ? (
                                <Button variant="secondary" onClick={() => setEdit({
                                    name: data.name,
                                    description: data.description || '',
                                    targetPositionId: data.targetPositionId || '',
                                    targetGradeId: data.targetGradeId || '',
                                    effectiveFrom: data.effectiveFrom || '',
                                    effectiveTo: data.effectiveTo || '',
                                })}>{t('talent.edit')}</Button>
                            ) : null}
                        </div>
                        {data.status === 'ACTIVE' ? (
                            <Button variant="danger" onClick={() => close.mutate()}>{t('talent.close')}</Button>
                        ) : null}
                    </div>
                ) : null}
                {screeningError ? <Alert tone="error">{screeningError}</Alert> : null}
                {analysis.data ? (
                    <>
                        <h2 className={page.sectionTitle}>{t('talent.analysisTitle')}</h2>
                        <StatRow>
                            <StatTile label={t('talent.candidates')} value={analysis.data.candidateCount ?? 0} />
                            <StatTile label={t('talent.active')} value={analysis.data.activeCandidateCount ?? 0} />
                            <StatTile label={t('talent.approved')} value={analysis.data.approvedCandidateCount ?? 0} />
                        </StatRow>
                        <CompositionTable
                            title={t('talent.byStatus')}
                            counts={Object.fromEntries(Object.entries(analysis.data.byStatus || {}).map(([status, count]) => [enumLabel(t, 'candidateStatus', status), count]))}
                            labelHeader={t('talent.status')}
                            countHeader={t('talent.count')}
                        />
                        <CompositionTable title={t('talent.byPosition')} counts={analysis.data.byPosition} labelHeader={t('talent.position')} countHeader={t('talent.count')} />
                        <CompositionTable title={t('talent.byGrade')} counts={analysis.data.byGrade} labelHeader={t('talent.grade')} countHeader={t('talent.count')} />
                    </>
                ) : null}
                <h2 className={page.sectionTitle}>{t('talent.screeningResult')}</h2>
                {screeningJob || screeningResults.data ? (
                    <p>{enumLabel(t, 'screeningStatus', screeningResults.data?.status || screeningJob?.status || 'PENDING')}</p>
                ) : (
                    <p className={page.meta}>{t('talent.screeningEmpty')}</p>
                )}
                {screeningResults.data?.explanationText ? <p>{screeningResults.data.explanationText}</p> : null}
                {(() => {
                    const history = (analyticScreenings.data?.content || [])
                        .filter((row) => String(row.reserveId) === String(id))
                        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
                    if (history.length <= 1) {
                        return null;
                    }
                    return (
                        <Select
                            label={t('talent.screeningHistory')}
                            value={screeningJobId || ''}
                            onChange={(event) => {
                                const selected = history.find((row) => String(row.jobId) === event.target.value);
                                setScreeningJob({ jobId: event.target.value, status: selected?.status });
                            }}
                        >
                            {history.map((row) => (
                                <option key={row.jobId || row.id} value={row.jobId}>
                                    {formatDate(row.createdAt || row.completedAt)}
                                    {' · '}
                                    {enumLabel(t, 'screeningStatus', row.status)}
                                    {' · '}
                                    {row.evaluatedCount ?? 0}/{row.candidateCount ?? 0}
                                </option>
                            ))}
                        </Select>
                    );
                })()}
                {manageTalent && selectedScreening.length ? (
                    <Button onClick={() => includeScreening.mutate()} disabled={includeScreening.isPending}>
                        {t('talent.includeSelected')}
                    </Button>
                ) : null}
                {screeningResults.data?.results?.length ? (
                    <DataTable
                        rows={sortScreeningResults(screeningResults.data.results)}
                        columns={[
                            {
                                key: 'pick',
                                header: '',
                                width: '6%',
                                render: (row) => (manageTalent && row.employeeId ? (
                                    <input
                                        type="checkbox"
                                        aria-label={employeeName(row.employeeId)}
                                        checked={selectedScreening.includes(row.employeeId)}
                                        onChange={() => setSelectedScreening((current) => (
                                            current.includes(row.employeeId)
                                                ? current.filter((item) => item !== row.employeeId)
                                                : [...current, row.employeeId]
                                        ))}
                                    />
                                ) : null),
                            },
                            { key: 'rank', header: t('analyticsUi.rank'), align: 'right', nowrap: true, width: '10%', render: (row) => row.rank ?? '—' },
                            { key: 'employee', header: t('talent.candidate'), width: '22%', render: (row) => employeeName(row.employeeId) },
                            { key: 'score', header: t('analyticsUi.score'), align: 'right', nowrap: true, width: '12%', render: (row) => formatScorePercent(row.score) },
                            { key: 'eligibility', header: t('talent.status'), width: '18%', render: (row) => enumLabel(t, 'eligibilityStatus', row.eligibilityStatus) },
                            { key: 'reason', header: t('common.reason'), wrap: true, width: '32%', render: (row) => row.exclusionReason || '—' },
                        ]}
                    />
                ) : null}
                <h2 className={page.sectionTitle}>{t('talent.candidates')}</h2>
                <DataTable
                    empty={t('talent.emptyCandidates')}
                    rows={candidates.data?.content || []}
                    onRowClick={(row) => navigate(`/app/talent-reserve/candidates/${row.id}`)}
                    columns={[
                        {
                            key: 'employeeId',
                            header: t('talent.candidate'),
                            render: (row) => row.employeeFullName || row.employeeName || employeeName(row.employeeId),
                        },
                        {
                            key: 'status',
                            header: t('talent.status'),
                            nowrap: true,
                            render: (row) => (
                                <Badge tone={statusTone('candidateStatus', row.status)}>
                                    {enumLabel(t, 'candidateStatus', row.status)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'actions',
                            header: t('common.actions'),
                            align: 'right',
                            nowrap: true,
                            render: (row) => {
                                const types = decisionTypes(row.status);
                                const canDecide = manageTalent
                                    && types.length
                                    && data.status !== 'CLOSED'
                                    && data.status !== 'ARCHIVED';
                                return (
                                    <div className={styles.inlineActions} onClick={(event) => event.stopPropagation()}>
                                        {canDecide ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDecision({ decision: types[0], comment: '' });
                                                    setDecideFor(row);
                                                }}
                                            >
                                                {t('talent.decide')}
                                            </Button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className={styles.more}
                                            onClick={() => navigate(`/app/talent-reserve/candidates/${row.id}`)}
                                        >
                                            {t('common.more')}
                                        </button>
                                    </div>
                                );
                            },
                        },
                    ]}
                />
                <Pagination
                    page={candidates.data?.number || 0}
                    totalPages={candidates.data?.totalPages || 0}
                    size={candidateQuery.size}
                    onChange={(pageNumber) => setCandidateQuery({ ...candidateQuery, page: pageNumber })}
                    onSizeChange={(size) => setCandidateQuery({ ...candidateQuery, size, page: 0 })}
                />
            </Card>
            <Modal open={Boolean(edit)} title={t('talent.edit')} onClose={() => setEdit(null)}>
                {edit ? (
                    <div className={page.stack}>
                        <div className={page.grid}>
                            <Input label={t('talent.name')} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                            <Select label={t('talent.position')} value={edit.targetPositionId || ''} onChange={(e) => setEdit({ ...edit, targetPositionId: e.target.value })}>
                                <option value="">{t('common.select')}</option>
                                {catalogs.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </Select>
                            <Select label={t('talent.grade')} value={edit.targetGradeId || ''} onChange={(e) => setEdit({ ...edit, targetGradeId: e.target.value })}>
                                <option value="">{t('common.select')}</option>
                                {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </Select>
                            <Input type="date" label={t('talent.effectiveFrom')} value={edit.effectiveFrom || ''} onChange={(e) => setEdit({ ...edit, effectiveFrom: e.target.value })} />
                            <Input type="date" label={t('talent.effectiveTo')} value={edit.effectiveTo || ''} onChange={(e) => setEdit({ ...edit, effectiveTo: e.target.value })} />
                            <div className={page.spanAll}>
                                <Textarea label={t('talent.description')} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                            </div>
                        </div>
                        <div className={page.row}>
                            <Button onClick={() => save.mutate()}>{t('common.save')}</Button>
                            <Button variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Modal
                open={Boolean(decideFor)}
                title={t('talent.decide')}
                onClose={() => setDecideFor(null)}
            >
                {decideFor ? (
                    <div className={page.stack}>
                        <p className={page.meta}>
                            {decideFor.employeeFullName || decideFor.employeeName || employeeName(decideFor.employeeId)}
                            {' · '}
                            {enumLabel(t, 'candidateStatus', decideFor.status)}
                        </p>
                        <Select
                            label={t('talent.decide')}
                            value={decision.decision}
                            onChange={(event) => setDecision({ ...decision, decision: event.target.value })}
                        >
                            {decisionTypes(decideFor.status).map((item) => (
                                <option key={item} value={item}>{enumLabel(t, 'candidateDecision', item)}</option>
                            ))}
                        </Select>
                        <Textarea
                            label={t('talent.comment')}
                            value={decision.comment}
                            onChange={(event) => setDecision({ ...decision, comment: event.target.value })}
                        />
                        <div className={page.row}>
                            <Button onClick={() => decide.mutate()} disabled={decide.isPending}>
                                {t('talent.decide')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setDecideFor(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Modal open={nominationOpen} title={t('talent.nominate')} onClose={() => setNominationOpen(false)}>
                <div className={page.stack}>
                    <EmployeePicker label={t('talent.employee')} value={nomination.employeeId} onChange={(e) => setNomination({ ...nomination, employeeId: e.target.value })} />
                    <Textarea label={t('talent.comment')} value={nomination.comment} onChange={(e) => setNomination({ ...nomination, comment: e.target.value })} />
                    <div className={page.row}>
                        <Button onClick={() => nominate.mutate()} disabled={!nomination.employeeId}>{t('talent.nominate')}</Button>
                        <Button variant="ghost" onClick={() => setNominationOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
