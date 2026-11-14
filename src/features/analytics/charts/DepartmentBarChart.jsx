import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function DepartmentBarChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid stroke={CHART_COLORS.track} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} unit="%" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: CHART_COLORS.dark, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
        </ResponsiveContainer>
    );
}
