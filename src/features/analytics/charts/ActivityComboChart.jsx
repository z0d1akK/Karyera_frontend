import { useTranslation } from 'react-i18next';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function ActivityComboChart({ data }) {
    const { t } = useTranslation();
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid stroke={CHART_COLORS.track} />
                <XAxis dataKey="label" tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                <YAxis yAxisId="hours" tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                <YAxis yAxisId="tasks" orientation="right" allowDecimals={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="hours" dataKey="hours" name={t('time.logged')} fill={CHART_COLORS.accent} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line yAxisId="tasks" type="monotone" dataKey="tasks" name={t('time.task')} stroke={CHART_COLORS.dark} strokeWidth={2} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
