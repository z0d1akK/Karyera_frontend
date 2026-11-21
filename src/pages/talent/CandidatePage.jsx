import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { formatDate, fullName } from '../../shared/lib/format.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { canManageTalent } from '../../shared/lib/roles.js';
import { useEmployeeNames } from '../../shared/lib/displayNames.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import { decisionTypes } from './candidateDecisions.js';
import styles from './CandidatePage.module.css';

export function CandidatePage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const employeeName = useEmployeeNames();
    const [decision, setDecision] = useState({ decision: 'APPROVE', comment: '' });
    const [decideOpen, setDecideOpen] = useState(false);
    const [decisionQuery, setDecisionQuery] = useState({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' });

    const query = useQuery({ queryKey: queryKeys.career.candidate(id), queryFn: () => careerApi.getCandidate(id) });
    const decisions = useQuery({
        queryKey: ['candidate-decisions', id, decisionQuery],
        enabled: Boolean(query.data?.id),
        queryFn: async () => unwrapPage(await careerApi.listDecisions(id, decisionQuery)),
    });
    const employee = useQuery({
        queryKey: queryKeys.employees.one(query.data?.employeeId),
        enabled: Boolean(query.data?.employeeId),
        queryFn: () => employeeApi.getById(query.data.employeeId),
    });
    const reserve = useQuery({
        queryKey: queryKeys.career.reserve(query.data?.reserveId),
        enabled: Boolean(query.data?.reserveId),
        queryFn: () => careerApi.getReserve(query.data.reserveId),
    });
    const decide = useMutation({
        mutationFn: () => careerApi.decide(id, { ...decision, expectedVersion: query.data.version }),
        onSuccess: () => {
            setDecideOpen(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.career.candidate(id) });
            queryClient.invalidateQueries({ queryKey: ['career', 'reserves'] });
            queryClient.invalidateQueries({ queryKey: ['candidate-decisions', id] });
            push({ type: 'success', message: t('talent.decisionSaved') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (query.isLoading) {
        return <Skeleton />;
    }
    if (query.isError || !query.data) {
        return <PageState title={t('errors.loadFailed')} onAction={query.refetch} actionLabel={t('common.retry')} />;
    }

    const candidate = query.data;
    const personName = employee.data ? fullName(employee.data) : (employeeName(candidate.employeeId) || t('talent.candidateTitle'));
    const availableDecisions = decisionTypes(candidate.status);
    const canDecide = canManageTalent(role) && availableDecisions.length;
    const history = decisions.data?.content || candidate.decisions || [];

    return (
        <section className={styles.page}>
            <div className={styles.head}>
                <BackLink to={`/app/talent-reserve/${candidate.reserveId}`}>{t('talent.backToReserve')}</BackLink>
                <PageHeader
                    title={personName}
                    description={t('talent.candidateHint')}
                    actions={(
                        <>
                            <Badge tone={statusTone('candidateStatus', candidate.status)}>
                                {enumLabel(t, 'candidateStatus', candidate.status)}
                            </Badge>
                            {canDecide ? (
                                <Button onClick={() => {
                                    setDecision({ decision: availableDecisions[0], comment: '' });
                                    setDecideOpen(true);
                                }}>{t('talent.decide')}</Button>
                            ) : null}
                        </>
                    )}
                />
            </div>
            <Card>
                <div className={styles.fields}>
                    <div className={styles.field}>
                        <span className={styles.label}>{t('talent.employee')}</span>
                        <Link className={styles.link} to={`/app/employees/${candidate.employeeId}`}>{personName}</Link>
                    </div>
                    <div className={styles.field}>
                        <span className={styles.label}>{t('talent.reserve')}</span>
                        <Link className={styles.link} to={`/app/talent-reserve/${candidate.reserveId}`}>
                            {reserve.data?.name || t('navigation.talentReserve')}
                        </Link>
                    </div>
                    <div className={styles.field}>
                        <span className={styles.label}>{t('talent.status')}</span>
                        <p className={styles.value}>{enumLabel(t, 'candidateStatus', candidate.status)}</p>
                    </div>
                    <div className={styles.field}>
                        <span className={styles.label}>{t('talent.nominatedAt')}</span>
                        <p className={styles.value}>{formatDate(candidate.nominatedAt)}</p>
                    </div>
                    {candidate.comment ? (
                        <div className={`${styles.field} ${styles.wide}`}>
                            <span className={styles.label}>{t('talent.comment')}</span>
                            <p className={styles.value}>{candidate.comment}</p>
                        </div>
                    ) : null}
                </div>
            </Card>
            <Card>
                <div className={styles.historyHead}>
                    <h2 className={page.sectionTitle}>{t('talent.decisions')}</h2>
                </div>
                <DataTable
                    empty={t('talent.emptyDecisions')}
                    rows={history}
                    columns={[
                        {
                            key: 'decision',
                            header: t('talent.decide'),
                            nowrap: true,
                            render: (row) => (
                                <Badge tone={statusTone('candidateDecision', row.decision)}>
                                    {enumLabel(t, 'candidateDecision', row.decision)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'comment',
                            header: t('talent.comment'),
                            wrap: true,
                            render: (row) => row.comment || t('common.dash'),
                        },
                        {
                            key: 'decidedByEmployeeId',
                            header: t('talent.decidedBy'),
                            render: (row) => employeeName(row.decidedByEmployeeId) || t('common.dash'),
                        },
                        {
                            key: 'decidedAt',
                            header: t('talent.decidedAt'),
                            nowrap: true,
                            align: 'right',
                            render: (row) => formatDate(row.decidedAt),
                        },
                    ]}
                />
                <Pagination
                    page={decisions.data?.number || 0}
                    totalPages={decisions.data?.totalPages || 0}
                    onChange={(pageNumber) => setDecisionQuery({ ...decisionQuery, page: pageNumber })}
                />
            </Card>
            <Modal open={decideOpen} title={t('talent.decide')} onClose={() => setDecideOpen(false)}>
                <div className={page.stack}>
                    <Select label={t('talent.decide')} value={decision.decision} onChange={(e) => setDecision({ ...decision, decision: e.target.value })}>
                        {availableDecisions.map((item) => (
                            <option key={item} value={item}>{enumLabel(t, 'candidateDecision', item)}</option>
                        ))}
                    </Select>
                    <Textarea label={t('talent.comment')} value={decision.comment} onChange={(e) => setDecision({ ...decision, comment: e.target.value })} />
                    <div className={page.row}>
                        <Button onClick={() => decide.mutate()} disabled={decide.isPending}>{t('talent.decide')}</Button>
                        <Button variant="ghost" onClick={() => setDecideOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
