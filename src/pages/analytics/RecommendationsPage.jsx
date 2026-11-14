import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyticsApi, recommendationView } from '../../features/analytics/api/analyticsApi.js';
import { RecommendationText, recommendationList } from '../../features/analytics/RecommendationText.jsx';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import page from '../../shared/styles/page.module.css';

export function RecommendationsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const query = useQuery({ queryKey: ['analytics', 'recommendations', id], queryFn: () => analyticsApi.recommendations(id) });
    const generate = useMutation({
        mutationFn: () => analyticsApi.regenerateRecommendations(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analytics', 'recommendations', id] });
            queryClient.invalidateQueries({ queryKey: ['analytics', 'assessment', id] });
        },
    });

    if (query.isLoading) {
        return <Skeleton rows={4} />;
    }
    if (query.isError) {
        return <PageState title={t('analyticsUi.generationFailed')} description={getApiError(query.error).message} />;
    }

    const items = recommendationList(query.data);
    const generateError = generate.isError ? getApiError(generate.error).message : '';
    return (
        <section className={page.sections}>
            <BackLink to={`/app/career/assessments/${id}`}>{t('common.back')}</BackLink>
            <PageHeader
                title={t('analyticsUi.recommendations')}
                actions={(
                    <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                        {generate.isPending ? t('analyticsUi.waiting') : t('analyticsUi.generateRecommendations')}
                    </Button>
                )}
            />
            {generateError ? <PageState title={t('analyticsUi.generationFailed')} description={generateError} /> : null}
            {!items.length ? <PageState title={t('analyticsUi.emptyRecommendation')} /> : null}
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
                    </Card>
                );
            })}
        </section>
    );
}
