import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { formatScorePercent, scoreToPercent } from '../../../shared/lib/format.js';
import { CHART_COLORS } from './chartTheme.js';

export function FitGauge({ value, label }) {
    const percent = Math.max(0, Math.min(100, scoreToPercent(value) ?? 0));
    const data = [
        { name: 'score', value: percent },
        { name: 'rest', value: 100 - percent },
    ];
    return (
        <div style={{ position: 'relative', height: 220 }}>
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={70}
                        outerRadius={96}
                        stroke="none"
                    >
                        <Cell fill={CHART_COLORS.accent} />
                        <Cell fill={CHART_COLORS.track} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div style={{
                position: 'absolute',
                inset: '48% 0 0',
                textAlign: 'center',
                color: CHART_COLORS.dark,
            }}>
                <strong style={{ fontSize: 28 }}>{formatScorePercent(value)}</strong>
                {label ? <div style={{ color: CHART_COLORS.muted, fontSize: 12 }}>{label}</div> : null}
            </div>
        </div>
    );
}
