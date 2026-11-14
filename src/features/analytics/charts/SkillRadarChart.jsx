import { useTranslation } from 'react-i18next';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function SkillRadarChart({ data }) {
    const { t } = useTranslation();
    return (
        <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data}>
                <PolarGrid stroke={CHART_COLORS.track} />
                <PolarAngleAxis dataKey="name" tick={{ fill: CHART_COLORS.dark, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} />
                <Radar name={t('analyticsUi.actual')} dataKey="actual" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.25} />
                <Radar name={t('analyticsUi.required')} dataKey="required" stroke={CHART_COLORS.coral} fill={CHART_COLORS.coral} fillOpacity={0.15} />
                <Legend />
                <Tooltip />
            </RadarChart>
        </ResponsiveContainer>
    );
}
