import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName } from '../../shared/lib/format.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { PageState } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

export function CareerOptionsPage() {
    const { id: routeId } = useParams();
    const location = useLocation();
    const { t } = useTranslation();
    const self = useAuthStore((state) => state.employee);
    const catalogs = useCatalogs();
    const push = useToastStore((state) => state.push);
    const employeeId = routeId || self?.id;
    const isSelf = Boolean(self?.id) && (!routeId || routeId === self.id);
    const [trackId, setTrackId] = useState('');
    const tracks = useQuery({
        queryKey: ['career', 'tracks', 'options'],
        queryFn: async () => unwrapPage(await careerApi.listTracks({ page: 0, size: 50, sortBy: 'name', sortDirection: 'ASC' })),
    });
    const start = useMutation({
        mutationFn: () => analyticsApi.startCareerOptions(employeeId, { trackId, maxOptions: 5 }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    useEffect(() => {
        const first = tracks.data?.content?.[0]?.id;
        if (!trackId && first) {
            setTrackId(first);
        }
    }, [trackId, tracks.data]);

    const options = start.data?.options || [];
    const positionName = (row) => (
        row.targetPositionName
        || row.positionName
        || catalogName((catalogs.positions || []).find((item) => item.id === row.targetPositionId))
        || '—'
    );
    const errorText = start.isError ? getApiError(start.error).message : '';
    const from = typeof location.state?.from === 'string' ? location.state.from : null;
    const backTo = from || (!isSelf && employeeId ? `/app/analytics/employees/${employeeId}` : null);

    return (
        <section className={page.sections}>
            {backTo ? <BackLink to={backTo}>{t('common.back')}</BackLink> : null}
            <PageHeader title={t('analyticsUi.careerOptions')} />
            {isSelf ? <AnalyticsNav /> : null}
            <Card>
                <div className={page.grid}>
                    <Select label={t('career.tracks')} value={trackId} onChange={(event) => setTrackId(event.target.value)}>
                        {(tracks.data?.content || []).map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </Select>
                </div>
                <div className={page.row}>
                    <Button disabled={!employeeId || !trackId || start.isPending} onClick={() => start.mutate()}>
                        {start.isPending ? t('analyticsUi.waiting') : t('analyticsUi.startOptions')}
                    </Button>
                </div>
            </Card>
            {start.isError ? <PageState title={t('errors.loadFailed')} description={errorText} /> : null}
            {start.data?.interpretationSummary ? <Card><p>{start.data.interpretationSummary}</p></Card> : null}
            <DataTable
                rows={options}
                columns={[
                    { key: 'position', header: t('employees.position'), render: positionName },
                    { key: 'score', header: t('analyticsUi.score'), render: (row) => row.totalScore ?? '—' },
                    { key: 'mandatory', header: t('analyticsUi.required'), render: (row) => String(row.mandatoryRequirementsMet) },
                    {
                        key: 'open',
                        header: t('common.open'),
                        render: (row) => row.assessmentId
                            ? <Link to={`/app/career/assessments/${row.assessmentId}`}>{t('analyticsUi.openAssessment')}</Link>
                            : '—',
                    },
                ]}
            />
        </section>
    );
}
