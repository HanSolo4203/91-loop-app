'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { ProfitLossSummary } from '@/types/database';

interface ProfitLossChartProps {
  data: ProfitLossSummary[];
}

export default function ProfitLossChart({ data }: ProfitLossChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Income vs Expenses vs Net Profit
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value: number) =>
              value.toLocaleString('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                minimumFractionDigits: 2,
              })
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            name="Income"
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            name="Expenses"
          />
          <Line
            type="monotone"
            dataKey="net_profit"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Net Profit"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
