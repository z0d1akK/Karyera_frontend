import { useTranslation } from 'react-i18next';

import { useCatalogs } from '../employees/hooks/useCatalogs.js';
import { formatScorePercent } from '../../shared/lib/format.js';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';

export function AnalyticsKpis({ overview }) {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    if (!overview) {
        return null;
    }
    const skillName = overview.topDeficitSkillName
        || catalogs.skills?.find((skill) => skill.id === overview.topDeficitSkillId)?.name;
    const deficit = overview.topDeficitSkillId
        ? `${skillName || t('analyticsUi.skill')} (${overview.topDeficitEmployees || 0})`
        : '—';
    return (
        <StatRow>
            <StatTile label={t('analyticsUi.assessed')} value={overview.assessedEmployees} />
            <StatTile label={t('analyticsUi.average')} value={formatScorePercent(overview.averageScore)} tone="accent" />
            <StatTile label={t('analyticsUi.completeData')} value={overview.employeesWithCompleteData} />
            <StatTile label={t('analyticsUi.fresh')} value={overview.freshAssessments} tone="success" />
            <StatTile
                label={t('analyticsUi.topReady')}
                value={overview.topReadyCount ?? 0}
                hint={formatScorePercent(overview.topReadinessShare)}
            />
            <StatTile label={t('analyticsUi.topDeficit')} value={deficit} />
            <StatTile label={t('analyticsUi.mandatoryGaps')} value={overview.mandatoryGaps ?? 0} tone="danger" />
            <StatTile label={t('analyticsUi.averageSkill')} value={formatScorePercent(overview.averageSkillScore)} />
        </StatRow>
    );
}
