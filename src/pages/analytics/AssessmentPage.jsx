import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { catalogName } from '../../shared/lib/format.js';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';

export function AssessmentPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const assessment = useQuery({ queryKey: ['analytics', 'assessment', id], queryFn: () => analyticsApi.assessment(id) });
    const gaps = useQuery({ queryKey: ['analytics', 'gaps', id], queryFn: () => analyticsApi.skillGaps(id) });

    if (assessment.isLoading) {
        return <Skeleton rows={5} />;
    }
    if (assessment.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={assessment.refetch} actionLabel={t('common.retry')} />;
    }

    const data = assessment.data;
    const quality = data.dataQualityStatus;
    return (
        <section>
            <PageHeader title={t('stubs.assessmentTitle')} description={quality === 'INSUFFICIENT' ? t('analyticsUi.insufficient') : null} />
            <StatRow>
                <StatTile label={t('analyticsUi.score')} value={data.totalScore ?? '—'} tone="accent" />
                <StatTile label={t('analyticsUi.skillScore')} value={data.skillScore ?? '—'} />
                <StatTile label={t('analyticsUi.experienceScore')} value={data.experienceScore ?? '—'} />
            </StatRow>
            <h2>{t('analyticsUi.gaps')}</h2>
            <DataTable
                rows={gaps.data || data.skillGaps || []}
                columns={[
                    { key: 'skill', header: t('analyticsUi.skill'), render: (row) => catalogName((catalogs.skills || []).find((skill) => skill.id === row.skillId)) || row.skillId },
                    { key: 'actual', header: t('analyticsUi.actual'), render: (row) => row.actualLevel },
                    { key: 'required', header: t('analyticsUi.required'), render: (row) => row.requiredLevel },
                    { key: 'gap', header: t('analyticsUi.gaps'), render: (row) => row.absoluteGap },
                ]}
            />
            <p><Link to={`/app/career/assessments/${id}/recommendations`}>{t('analyticsUi.recommendations')}</Link></p>
        </section>
    );
}
