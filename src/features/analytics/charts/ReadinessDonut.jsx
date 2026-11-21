import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CHART_SERIES } from './chartTheme.js';

export function ReadinessDonut({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} dataKey="employees" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} cy="42%">
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
