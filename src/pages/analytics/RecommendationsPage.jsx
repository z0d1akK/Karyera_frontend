import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi, readRecommendation } from '../../features/analytics/api/analyticsApi.js';
import { enumLabel, statusTone } from '../../shared/lib/enums.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';

function lines(value) {
    if (!value) {
        return [];
    }
    const items = Array.isArray(value) ? value : [value];
    return items
        .map((item) => (typeof item === 'string' ? item : item.explanation || item.text || item.title || item.description || ''))
        .filter(Boolean);
}

function recommendationBody(content) {
    const parsed = readRecommendation(content);
    if (!parsed?.explanation) {
        return parsed;
    }
    return {
        ...parsed.explanation,
        recommendations: parsed.development?.recommendations || parsed.explanation.recommendations,
    };
}

export function RecommendationsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const query = useQuery({ queryKey: ['analytics', 'recommendations', id], queryFn: () => analyticsApi.recommendations(id) });

    if (query.isLoading) {
        return <Skeleton rows={4} />;
    }
    if (query.isError) {
        return <PageState title={t('analyticsUi.generationFailed')} description={t('analyticsUi.score')} />;
    }

    const items = query.data || [];
    return (
        <section>
            <PageHeader title={t('analyticsUi.recommendations')} actions={<Link to={`/app/career/assessments/${id}`}>{t('analyticsUi.openAssessment')}</Link>} />
            {!items.length ? <PageState title={t('analyticsUi.emptyRecommendation')} /> : null}
            {items.map((item) => {
                const body = recommendationBody(item.content);
                const failed = item.status === 'FAILED' || !body;
                return (
                    <Card key={item.id}>
                        <Badge tone={statusTone('recommendationStatus', item.status)}>{enumLabel(t, 'recommendationStatus', item.status)}</Badge>
                        {failed ? <p>{t('analyticsUi.generationFailed')}</p> : null}
                        {item.errorCode === 'INSUFFICIENT_DATA' ? <p>{t('analyticsUi.insufficient')}</p> : null}
                        {body?.summary ? <p>{body.summary}</p> : null}
                        {lines(body?.strengths).map((line) => <p key={line}>{line}</p>)}
                        {lines(body?.developmentAreas).map((line) => <p key={line}>{line}</p>)}
                        {lines(body?.recommendations).map((line) => <p key={line}>{line}</p>)}
                        {body?.limitations ? <p>{Array.isArray(body.limitations) ? body.limitations.join(' ') : body.limitations}</p> : null}
                    </Card>
                );
            })}
        </section>
    );
}
