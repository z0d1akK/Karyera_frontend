import { useTranslation } from 'react-i18next';

import { recommendationView } from './api/analyticsApi.js';
import page from '../../shared/styles/page.module.css';

export function recommendationList(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (Array.isArray(data?.content)) {
        return data.content;
    }
    return [];
}

export function RecommendationText({ content }) {
    const { t } = useTranslation();
    const view = recommendationView(content);
    if (!view) {
        return <p>{t('analyticsUi.emptyRecommendation')}</p>;
    }
    return (
        <div className={page.stack}>
            {view.summary ? <p>{view.summary}</p> : null}
            {view.strengths.length ? (
                <div>
                    <h3 className={page.sectionTitle}>{t('analyticsUi.strengths')}</h3>
                    {view.strengths.map((line) => <p key={line}>{line}</p>)}
                </div>
            ) : null}
            {view.developmentAreas.length ? (
                <div>
                    <h3 className={page.sectionTitle}>{t('analyticsUi.gaps')}</h3>
                    {view.developmentAreas.map((line) => <p key={line}>{line}</p>)}
                </div>
            ) : null}
            {view.recommendations.length ? (
                <div className={page.stack}>
                    <h3 className={page.sectionTitle}>{t('analyticsUi.recommendations')}</h3>
                    {view.recommendations.map((item, index) => (
                        <div key={`${item.title}-${index}`}>
                            {item.title ? <p><strong>{item.title}</strong></p> : null}
                            {item.description ? <p>{item.description}</p> : null}
                            {item.activities.map((line) => <p key={line}>{line}</p>)}
                            {item.outcome ? <p>{item.outcome}</p> : null}
                        </div>
                    ))}
                </div>
            ) : null}
            {view.limitations.length ? (
                <div>
                    <h3 className={page.sectionTitle}>{t('analyticsUi.limitations')}</h3>
                    {view.limitations.map((line) => <p key={line}>{line}</p>)}
                </div>
            ) : null}
        </div>
    );
}
