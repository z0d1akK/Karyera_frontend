import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyticsApi, readRecommendation, recommendationView } from '../../features/analytics/api/analyticsApi.js';
import { RecommendationText, recommendationList } from '../../features/analytics/RecommendationText.jsx';
import { StartAssessment } from '../../features/analytics/StartAssessment.jsx';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageDevelopmentPlans } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Textarea } from '../../shared/ui/Input/Input.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import page from '../../shared/styles/page.module.css';

export function RecommendationsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const employee = useAuthStore((state) => state.employee);
    const role = useAuthStore((state) => state.session?.role);
    const fromNav = !id;
    const canEdit = canManageDevelopmentPlans(role);

    const assessments = useQuery({
        queryKey: ['analytics', 'assessments', employee?.id],
        enabled: fromNav && Boolean(employee?.id),
        queryFn: () => analyticsApi.assessments(employee.id),
    });

    const assessmentId = id || latestAssessment(assessments.data)?.id;
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
                        {canEdit && view ? (
                            <RecommendationSummaryEditor
                                assessmentId={assessmentId}
                                item={item}
                            />
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

function RecommendationSummaryEditor({ assessmentId, item }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const push = useToastStore((state) => state.push);
    const view = recommendationView(item.content);
    const [draft, setDraft] = useState(view?.summary || '');

    useEffect(() => {
        setDraft(view?.summary || '');
    }, [item.id, view?.summary]);

    const save = useMutation({
        mutationFn: () => analyticsApi.updateRecommendation(
            assessmentId,
            item.id,
            withUpdatedSummary(item.content, draft),
        ),
        onSuccess: () => {
            queryClient.setQueryData(['analytics', 'recommendations', assessmentId], (current) => {
                const items = recommendationList(current);
                const next = items.map((row) => (row.id === item.id
                    ? { ...row, content: withUpdatedSummary(item.content, draft) }
                    : row));
                return Array.isArray(current) ? next : { ...current, content: next };
            });
            queryClient.invalidateQueries({ queryKey: ['analytics', 'recommendations', assessmentId] });
            push({ type: 'success', message: t('profile.saved') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    return (
        <div className={page.stack}>
            <Textarea
                label={t('analyticsUi.editRecommendation')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={6}
            />
            <div className={page.row}>
                <Button onClick={() => save.mutate()} disabled={save.isPending || draft === (view?.summary || '')}>
                    {t('analyticsUi.saveRecommendation')}
                </Button>
            </div>
        </div>
    );
}

function withUpdatedSummary(content, summary) {
    const parsed = readRecommendation(content);
    if (!parsed || typeof parsed !== 'object') {
        return JSON.stringify({ summary });
    }
    const next = { ...parsed };
    if (next.explanation && typeof next.explanation === 'object') {
        next.explanation = { ...next.explanation, summary };
    } else {
        next.summary = summary;
    }
    return JSON.stringify(next);
}

function uniqueRecommendations(items) {
    const latest = (items || []).find((item) => item.status === 'COMPLETED' || item.status === 'FALLBACK')
        || (items || [])[0];
    return latest ? [latest] : [];
}

function latestAssessment(items) {
    const list = [...(items || [])];
    if (!list.length) {
        return null;
    }
    const completed = list.filter((item) => item.status === 'COMPLETED' || item.status === 'FRESH');
    const source = completed.length ? completed : list;
    return source.sort((left, right) => String(right.calculatedAt || right.createdAt || '')
        .localeCompare(String(left.calculatedAt || left.createdAt || '')))[0];
}
