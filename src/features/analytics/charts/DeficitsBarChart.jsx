import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

import { CHART_COLORS } from './chartTheme.js';

function SkillTick({ x, y, payload }) {
    const label = String(payload?.value ?? '');
    const shown = label.length > 22 ? `${label.slice(0, 21)}…` : label;
    return (
        <text x={x} y={y} dy={4} textAnchor="end" fill={CHART_COLORS.dark} fontSize={12} fontWeight={600}>
            {shown}
        </text>
    );
}

export function DeficitsBarChart({ data }) {
    const { t } = useTranslation();
    const rows = data || [];
    const max = Math.max(1, ...rows.map((row) => Number(row.employees || 0)));
    const yWidth = Math.min(168, Math.max(88, ...rows.map((row) => Math.min(22, String(row.name || '').length) * 7.2 + 12)));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
                barCategoryGap="28%"
            >
                <CartesianGrid stroke={CHART_COLORS.track} horizontal={false} />
                <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, max]}
                    tickCount={Math.min(6, max + 1)}
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    axisLine={{ stroke: CHART_COLORS.track }}
                    tickLine={false}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={yWidth}
                    interval={0}
                    tick={<SkillTick />}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <Tooltip
                    formatter={(value) => [value, t('analyticsUi.employeesCount')]}
                    labelStyle={{ color: CHART_COLORS.dark, fontWeight: 600 }}
                    cursor={{ fill: 'rgba(229, 125, 96, 0.08)' }}
                />
                <Bar dataKey="employees" fill={CHART_COLORS.coral} radius={[0, 6, 6, 0]} maxBarSize={28}>
                    <LabelList dataKey="employees" position="right" fill={CHART_COLORS.dark} fontSize={12} fontWeight={600} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
