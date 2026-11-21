import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyticsApi, recommendationView } from '../../features/analytics/api/analyticsApi.js';
import { RecommendationText, recommendationList } from '../../features/analytics/RecommendationText.jsx';
import { StartAssessment } from '../../features/analytics/StartAssessment.jsx';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageDevelopmentPlans } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Textarea } from '../../shared/ui/Input/Input.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import page from '../../shared/styles/page.module.css';

export function RecommendationsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const push = useToastStore((state) => state.push);
    const employee = useAuthStore((state) => state.employee);
    const role = useAuthStore((state) => state.session?.role);
    const canEdit = canManageDevelopmentPlans(role);
    const [draft, setDraft] = useState('');
    const fromNav = !id;

    const assessments = useQuery({
        queryKey: ['analytics', 'assessments', employee?.id],
        enabled: fromNav && Boolean(employee?.id),
        queryFn: () => analyticsApi.assessments(employee.id),
    });

    const assessmentId = id || (assessments.data || [])[0]?.id;
    const query = useQuery({
        queryKey: ['analytics', 'recommendations', assessmentId],
        enabled: Boolean(assessmentId),
        queryFn: () => analyticsApi.recommendations(assessmentId),
    });
    const generate = useMutation({
        mutationFn: () => analyticsApi.regenerateRecommendations(assessmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analytics', 'recommendations', assessmentId] });
            queryClient.invalidateQueries({ queryKey: ['analytics', 'assessment', assessmentId] });
        },
    });
    const saveText = useMutation({
        mutationFn: ({ recommendationId, content }) => analyticsApi.updateRecommendation(assessmentId, recommendationId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analytics', 'recommendations', assessmentId] });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    if ((fromNav && assessments.isLoading) || (assessmentId && query.isLoading)) {
        return fromNav ? (
            <AnalyticsPage title={t('analyticsUi.recommendations')} description={t('analyticsUi.recommendationsHint')}>
                <Skeleton rows={4} />
            </AnalyticsPage>
        ) : <Skeleton rows={4} />;
    }
    if (query.isError) {
        const errorState = (
            <PageState title={t('analyticsUi.generationFailed')} description={getApiError(query.error).message} />
        );
        return fromNav ? (
            <AnalyticsPage title={t('analyticsUi.recommendations')} description={t('analyticsUi.recommendationsHint')}>
                {errorState}
            </AnalyticsPage>
        ) : errorState;
    }

    const items = uniqueRecommendations(recommendationList(query.data));
    const generateError = generate.isError ? getApiError(generate.error).message : '';
    const actions = assessmentId ? (
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? t('analyticsUi.waiting') : t('analyticsUi.generateRecommendations')}
        </Button>
    ) : null;
    const body = (
        <>
            {generateError ? <PageState title={t('analyticsUi.generationFailed')} description={generateError} /> : null}
            {!assessmentId ? (
                <>
                    <PageState title={t('analyticsUi.emptyRecommendation')} description={t('analyticsUi.needAssessment')} />
                    {employee?.id ? (
                        <StartAssessment
                            employeeId={employee.id}
                            positionId={employee.position?.id || employee.positionId || ''}
                            gradeId={employee.grade?.id || employee.gradeId || ''}
                        />
                    ) : null}
                </>
            ) : null}
            {assessmentId && !items.length ? <PageState title={t('analyticsUi.emptyRecommendation')} /> : null}
            {items.map((item) => {
                const view = recommendationView(item.content);
                const failed = item.status === 'FAILED' && !view;
                return (
                    <Card key={item.id}>
                        <Badge tone={statusTone('recommendationStatus', item.status)}>{enumLabel(t, 'recommendationStatus', item.status)}</Badge>
                        {item.status === 'FALLBACK' ? <p>{t('analyticsUi.fallback')}</p> : null}
                        {failed ? <p>{t('analyticsUi.generationFailed')}</p> : null}
                        {item.errorCode === 'INSUFFICIENT_DATA' ? <p>{t('analyticsUi.insufficient')}</p> : null}
                        {view ? <RecommendationText content={item.content} /> : null}
                        {canEdit && (item.status === 'COMPLETED' || item.status === 'FALLBACK') ? (
                            <div className={page.stack}>
                                <Textarea
                                    label={t('analyticsUi.editRecommendation')}
                                    value={draft || (typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2))}
                                    onChange={(event) => setDraft(event.target.value)}
                                />
                                <Button
                                    onClick={() => saveText.mutate({
                                        recommendationId: item.id,
                                        content: draft || (typeof item.content === 'string' ? item.content : JSON.stringify(item.content)),
                                    })}
                                    disabled={saveText.isPending}
                                >
                                    {t('common.save')}
                                </Button>
                            </div>
                        ) : null}
                    </Card>
                );
            })}
        </>
    );

    if (fromNav) {
        return (
            <AnalyticsPage
                title={t('analyticsUi.recommendations')}
                description={t('analyticsUi.recommendationsHint')}
                actions={actions}
            >
                {body}
            </AnalyticsPage>
        );
    }

    return (
        <section className={page.sections}>
            <BackLink to={`/app/career/assessments/${assessmentId}`}>{t('common.back')}</BackLink>
            <PageHeader
                title={t('analyticsUi.recommendations')}
                description={t('analyticsUi.recommendationsHint')}
                actions={actions}
            />
            {body}
        </section>
    );
}

function uniqueRecommendations(items) {
    const latest = (items || []).find((item) => item.status === 'COMPLETED' || item.status === 'FALLBACK')
        || (items || [])[0];
    return latest ? [latest] : [];
}
