import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function DeficitsBarChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid stroke={CHART_COLORS.track} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: CHART_COLORS.dark, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="employees" fill={CHART_COLORS.coral} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
        </ResponsiveContainer>
    );
}
