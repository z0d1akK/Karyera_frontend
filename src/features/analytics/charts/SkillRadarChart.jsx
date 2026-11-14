import { useTranslation } from 'react-i18next';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function SkillRadarChart({ data }) {
    const { t } = useTranslation();
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart
                data={data}
                cx="50%"
                cy="46%"
                outerRadius="58%"
                margin={{ top: 22, right: 40, bottom: 6, left: 40 }}
            >
                <PolarGrid stroke={CHART_COLORS.track} />
                <PolarAngleAxis
                    dataKey="name"
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.dark, fontSize: 11 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={t('analyticsUi.actual')} dataKey="actual" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.25} />
                <Radar name={t('analyticsUi.required')} dataKey="required" stroke={CHART_COLORS.coral} fill={CHART_COLORS.coral} fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
            </RadarChart>
        </ResponsiveContainer>
    );
}
