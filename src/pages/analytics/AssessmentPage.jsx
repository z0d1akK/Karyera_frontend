import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { ChartCard } from '../../features/analytics/charts/ChartCard.jsx';
import { FitGauge } from '../../features/analytics/charts/FitGauge.jsx';
import { SkillRadarChart } from '../../features/analytics/charts/SkillRadarChart.jsx';
import { mapRadar } from '../../features/analytics/charts/chartMappers.js';
import { RecommendationText, recommendationList } from '../../features/analytics/RecommendationText.jsx';
import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { catalogName, formatScorePercent } from '../../shared/lib/format.js';
import { canManageDevelopmentPlans } from '../../shared/lib/roles.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import page from '../../shared/styles/page.module.css';

export function AssessmentPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const catalogs = useCatalogs();
    const role = useAuthStore((state) => state.session?.role);
    const selfId = useAuthStore((state) => state.employee?.id);
    const push = useToastStore((state) => state.push);
    const queryClient = useQueryClient();
    const assessment = useQuery({ queryKey: ['analytics', 'assessment', id], queryFn: () => analyticsApi.assessment(id) });
    const gaps = useQuery({ queryKey: ['analytics', 'gaps', id], queryFn: () => analyticsApi.skillGaps(id) });
    const recs = useQuery({ queryKey: ['analytics', 'recommendations', id], queryFn: () => analyticsApi.recommendations(id) });
    const generate = useMutation({
        mutationFn: () => analyticsApi.regenerateRecommendations(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analytics', 'recommendations', id] });
            queryClient.invalidateQueries({ queryKey: ['analytics', 'assessment', id] });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const draft = useMutation({
        mutationFn: () => careerApi.fromAssessment(id),
        onSuccess: (plan) => navigate(`/app/development/plans/${plan.id}`),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if (assessment.isLoading) {
        return <Skeleton rows={5} />;
    }
    if (assessment.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={assessment.refetch} actionLabel={t('common.retry')} />;
    }

    const data = assessment.data;
    const quality = data.dataQualityStatus;
    const recList = recommendationList(recs.data).length ? recommendationList(recs.data) : recommendationList(data.recommendations);
    const rec = recList[0];
    const project = (data.components || []).find((item) => item.componentCode === 'PROJECT');
    return (
        <section className={page.sections}>
            <BackLink to={data.employeeId && data.employeeId === selfId ? '/app/analytics/me' : data.employeeId ? `/app/analytics/employees/${data.employeeId}` : '/app/analytics'}>{t('common.back')}</BackLink>
            <PageHeader
                title={t('stubs.assessmentTitle')}
                description={quality === 'INSUFFICIENT' ? t('analyticsUi.insufficient') : null}
                actions={(
                    <div className={page.row}>
                        <Button variant="ghost" onClick={() => analyticsApi.downloadReport('POSITION_FIT', { assessmentId: id })}>
                            {t('analyticsUi.downloadPdf')}
                        </Button>
                        {canManageDevelopmentPlans(role) ? (
                            <Button onClick={() => draft.mutate()} disabled={draft.isPending}>{t('analyticsUi.draftIdp')}</Button>
                        ) : null}
                    </div>
                )}
            />
            <StatRow>
                <StatTile label={t('analyticsUi.score')} value={formatScorePercent(data.totalScore)} tone="accent" />
                <StatTile label={t('analyticsUi.skillScore')} value={formatScorePercent(data.skillScore)} />
                <StatTile label={t('analyticsUi.experienceScore')} value={formatScorePercent(data.experienceScore)} />
                <StatTile label={t('analyticsUi.projectScore')} value={formatScorePercent(project?.rawScore)} />
            </StatRow>
            <div className={page.grid}>
                <ChartCard title={t('analyticsUi.score')} compact>
                    <FitGauge value={data.totalScore} label={t('analyticsUi.score')} />
                </ChartCard>
                <ChartCard title={t('analyticsUi.gaps')} empty={!mapRadar(gaps.data || data.skillGaps || [], catalogs).length} compact>
                    <SkillRadarChart data={mapRadar(gaps.data || data.skillGaps || [], catalogs)} />
                </ChartCard>
            </div>
            <Card>
                <h2 className={page.sectionTitle}>{t('analyticsUi.gaps')}</h2>
                <DataTable
                    rows={gaps.data || data.skillGaps || []}
                    columns={[
                        {
                            key: 'skill',
                            header: t('analyticsUi.skill'),
                            render: (row) => {
                                const name = catalogName((catalogs.skills || []).find((skill) => skill.id === row.skillId)) || '—';
                                return <span className={row.requirementMet === false ? page.dangerText : undefined}>{name}</span>;
                            },
                        },
                        { key: 'actual', header: t('analyticsUi.actual'), render: (row) => row.actualLevel ?? '—' },
                        { key: 'required', header: t('analyticsUi.required'), render: (row) => row.requiredLevel ?? '—' },
                        { key: 'gap', header: t('analyticsUi.gaps'), render: (row) => row.absoluteGap ?? '—' },
                    ]}
                />
            </Card>
            <Card>
                <h2 className={page.sectionTitle}>{t('analyticsUi.recommendations')}</h2>
                {!rec ? (
                    <div className={page.stack}>
                        <p>{t('analyticsUi.emptyRecommendation')}</p>
                        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                            {generate.isPending ? t('analyticsUi.waiting') : t('analyticsUi.generateRecommendations')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <Badge tone={statusTone('recommendationStatus', rec.status)}>{enumLabel(t, 'recommendationStatus', rec.status)}</Badge>
                        {rec.status === 'FAILED' ? <p>{t('analyticsUi.generationFailed')}</p> : null}
                        {rec.content ? <RecommendationText content={rec.content} /> : <p>{t('analyticsUi.emptyRecommendation')}</p>}
                        {rec.status === 'FAILED' || !rec.content ? (
                            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                                {generate.isPending ? t('analyticsUi.waiting') : t('analyticsUi.generateRecommendations')}
                            </Button>
                        ) : null}
                    </>
                )}
            </Card>
        </section>
    );
}
