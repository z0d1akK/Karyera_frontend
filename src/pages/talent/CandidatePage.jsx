import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { fullName } from '../../shared/lib/format.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';

export function CandidatePage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [decision, setDecision] = useState({ decision: 'APPROVE', comment: '' });
    const [decideOpen, setDecideOpen] = useState(false);
    const [decisionQuery, setDecisionQuery] = useState({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' });

    const query = useQuery({ queryKey: queryKeys.career.candidate(id), queryFn: () => careerApi.getCandidate(id) });
    const decisions = useQuery({
        queryKey: ['candidate-decisions', id, decisionQuery],
        queryFn: async () => unwrapPage(await careerApi.listDecisions(id, decisionQuery)),
    });
    const employee = useQuery({
        queryKey: queryKeys.employees.one(query.data?.employeeId),
        enabled: Boolean(query.data?.employeeId),
        queryFn: () => employeeApi.getById(query.data.employeeId),
    });
    const decide = useMutation({
        mutationFn: () => careerApi.decide(id, { ...decision, expectedVersion: query.data.version }),
        onSuccess: () => {
            setDecideOpen(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.career.candidate(id) });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (query.isLoading) {
        return <Skeleton />;
    }

    const candidate = query.data;

    return (
        <section>
            <BackLink to={`/app/talent-reserve/${candidate.reserveId}`}>{t('talent.backToReserve')}</BackLink>
            <PageHeader title={t('talent.candidateTitle')} actions={<Badge>{enumLabel(t, 'candidateStatus', candidate.status)}</Badge>} />
            <Card>
                <p>{t('talent.employee')}: <Link to={`/app/employees/${candidate.employeeId}`}>{employee.data ? fullName(employee.data) : '—'}</Link></p>
                <p>{t('talent.reserve')}: <Link to={`/app/talent-reserve/${candidate.reserveId}`}>{t('navigation.talentReserve')}</Link></p>
                <p>{candidate.comment}</p>
                <h3>{t('talent.decisions')}</h3>
                {(decisions.data?.content || candidate.decisions || []).map((item) => (
                    <p key={item.id}>{enumLabel(t, 'candidateDecision', item.decision)} · {item.comment}</p>
                ))}
                <Pagination
                    page={decisions.data?.number || 0}
                    totalPages={decisions.data?.totalPages || 0}
                    size={decisionQuery.size}
                    onChange={(pageNumber) => setDecisionQuery({ ...decisionQuery, page: pageNumber })}
                    onSizeChange={(size) => setDecisionQuery({ ...decisionQuery, size, page: 0 })}
                />
                {canManageHr(role) && !['APPROVED', 'REJECTED', 'REMOVED'].includes(candidate.status) ? (
                    <div className={page.row}>
                        <Button onClick={() => setDecideOpen(true)}>{t('talent.decide')}</Button>
                    </div>
                ) : null}
            </Card>
            <Modal open={decideOpen} title={t('talent.decide')} onClose={() => setDecideOpen(false)}>
                <div className={page.stack}>
                    <Select label={t('talent.decide')} value={decision.decision} onChange={(e) => setDecision({ ...decision, decision: e.target.value })}>
                        {['APPROVE', 'REJECT', 'REQUEST_REVIEW', 'REMOVE'].map((item) => (
                            <option key={item} value={item}>{enumLabel(t, 'candidateDecision', item)}</option>
                        ))}
                    </Select>
                    <Textarea label={t('talent.comment')} value={decision.comment} onChange={(e) => setDecision({ ...decision, comment: e.target.value })} />
                    <div className={page.row}>
                        <Button onClick={() => decide.mutate()}>{t('talent.decide')}</Button>
                        <Button variant="ghost" onClick={() => setDecideOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
