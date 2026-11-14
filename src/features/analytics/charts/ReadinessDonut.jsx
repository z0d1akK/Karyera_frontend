import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CHART_SERIES } from './chartTheme.js';

export function ReadinessDonut({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} dataKey="employees" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                    {data.map((item, index) => (
                        <Cell key={item.name} fill={CHART_SERIES[index % CHART_SERIES.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
