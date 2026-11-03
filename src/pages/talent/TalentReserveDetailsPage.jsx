import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { Alert } from '../../shared/ui/Alert/Alert.jsx';
import { Input } from '../../shared/ui/Input/Input.jsx';
import { CollapsePanel } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';

export function TalentReserveDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const role = useAuthStore((s) => s.session?.role);
    const catalogs = useCatalogs();
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [nomination, setNomination] = useState({ employeeId: '', comment: '' });
    const [edit, setEdit] = useState(null);
    const [screeningError, setScreeningError] = useState('');
    const [screeningJob, setScreeningJob] = useState(null);

    const reserve = useQuery({ queryKey: queryKeys.career.reserve(id), queryFn: () => careerApi.getReserve(id) });
    const [candidateQuery, setCandidateQuery] = useState({ page: 0, size: 20, sortBy: 'nominatedAt', sortDirection: 'DESC' });
    const candidates = useQuery({
        queryKey: [...queryKeys.career.candidates(id), candidateQuery],
        queryFn: async () => unwrapPage(await careerApi.listCandidates(id, candidateQuery)),
    });

    const nominate = useMutation({
        mutationFn: () => careerApi.nominate(id, nomination),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.career.candidates(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const screening = useMutation({
        mutationFn: () => careerApi.startScreening(id, {}),
        onSuccess: (data) => {
            setScreeningError('');
            setScreeningJob(data);
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
        enabled: false,
    });
    const activate = useMutation({
        mutationFn: () => careerApi.activateReserve(id, { expectedVersion: reserve.data?.version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.career.reserve(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const close = useMutation({
        mutationFn: () => careerApi.closeReserve(id, { expectedVersion: reserve.data?.version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.career.reserve(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const save = useMutation({
        mutationFn: () => careerApi.updateReserve(id, Object.fromEntries(Object.entries(edit).filter(([, value]) => value !== ''))),
        onSuccess: () => {
            setEdit(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.career.reserve(id) });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (reserve.isLoading) {
        return <Skeleton />;
    }

    const data = reserve.data;

    return (
        <section>
            <BackLink to="/app/talent-reserve">{t('talent.back')}</BackLink>
            <PageHeader title={data.name} actions={<Badge>{enumLabel(t, 'reserveStatus', data.status)}</Badge>} />
            <Card>
                <p>{data.description}</p>
                {screeningError ? <Alert tone="error">{screeningError}</Alert> : null}
                {analysis.isError ? <Alert tone="error">{t('talent.analysisFailed')}</Alert> : null}
                {analysis.data ? (
                    <div className={page.grid}>
                        <p>{t('talent.candidates')}: {analysis.data.candidateCount ?? 0}</p>
                        <p>{t('talent.active')}: {analysis.data.activeCandidateCount ?? 0}</p>
                        <p>{t('talent.approved')}: {analysis.data.approvedCandidateCount ?? 0}</p>
                        <p>{t('talent.byStatus')}: {Object.entries(analysis.data.byStatus || {}).map(([key, value]) => `${enumLabel(t, 'candidateStatus', key)} ${value}`).join(', ') || t('common.dash')}</p>
                        <p>{t('talent.byPosition')}: {Object.entries(analysis.data.byPosition || {}).map(([key, value]) => `${key} ${value}`).join(', ') || t('common.dash')}</p>
                        <p>{t('talent.byGrade')}: {Object.entries(analysis.data.byGrade || {}).map(([key, value]) => `${key} ${value}`).join(', ') || t('common.dash')}</p>
                    </div>
                ) : null}
                {screeningJob ? <p>{t('talent.screeningResult')}: {screeningJob.status || screeningJob.jobId || screeningJob.id}</p> : null}
                {canManageHr(role) ? (
                    <div className={page.row}>
                        <Button onClick={() => activate.mutate()}>{t('talent.activate')}</Button>
                        <Button variant="ghost" onClick={() => close.mutate()}>{t('talent.close')}</Button>
                        <Button variant="coral" onClick={() => screening.mutate()}>{t('talent.screening')}</Button>
                        <Button variant="secondary" onClick={() => analysis.refetch()}>{t('talent.analysis')}</Button>
                        <Button variant="secondary" onClick={() => setEdit({
                            name: data.name,
                            description: data.description || '',
                            targetPositionId: data.targetPositionId || '',
                            targetGradeId: data.targetGradeId || '',
                            effectiveFrom: data.effectiveFrom || '',
                            effectiveTo: data.effectiveTo || '',
                        })}>{t('talent.edit')}</Button>
                    </div>
                ) : null}
                {edit ? (
                    <CollapsePanel label={t('talent.edit')} open onOpenChange={(next) => { if (!next) setEdit(null); }}>
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
                    </CollapsePanel>
                ) : null}
                <DataTable
                    rows={candidates.data?.content || []}
                    columns={[
                        {
                            key: 'employeeId',
                            header: t('talent.candidate'),
                            render: (row) => (
                                <Link to={`/app/talent-reserve/candidates/${row.id}`}>{row.employeeFullName || row.employeeName || row.employeeId}</Link>
                            ),
                        },
                        { key: 'status', header: t('talent.status'), render: (row) => enumLabel(t, 'candidateStatus', row.status) },
                    ]}
                />
                {canManageHr(role) ? (
                    <CollapsePanel label={t('talent.nominate')}>
                        <div className={page.grid}>
                        <EmployeePicker label={t('talent.employee')} value={nomination.employeeId} onChange={(e) => setNomination({ ...nomination, employeeId: e.target.value })} />
                        <div className={page.spanAll}>
                        <Textarea label={t('talent.comment')} value={nomination.comment} onChange={(e) => setNomination({ ...nomination, comment: e.target.value })} />
                        </div>
                        <Button onClick={() => nominate.mutate()}>{t('talent.nominate')}</Button>
                        </div>
                    </CollapsePanel>
                ) : null}
                <Pagination
                    page={candidates.data?.number || 0}
                    totalPages={candidates.data?.totalPages || 0}
                    size={candidateQuery.size}
                    onChange={(pageNumber) => setCandidateQuery({ ...candidateQuery, page: pageNumber })}
                    onSizeChange={(size) => setCandidateQuery({ ...candidateQuery, size, page: 0 })}
                />
            </Card>
        </section>
    );
}
