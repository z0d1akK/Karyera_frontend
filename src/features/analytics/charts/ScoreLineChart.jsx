import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_COLORS } from './chartTheme.js';

export function ScoreLineChart({ data, xKey = 'label', yKey = 'score' }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid stroke={CHART_COLORS.track} />
                <XAxis dataKey={xKey} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} unit="%" />
                <Tooltip formatter={(value) => [`${value}%`]} />
                <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}
