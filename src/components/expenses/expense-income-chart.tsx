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

interface ExpenseIncomeChartProps {
  data: ProfitLossSummary[];
}

export default function ExpenseIncomeChart({ data }: ExpenseIncomeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Monthly Income vs Expenses
        </h3>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          No data for the selected period.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Monthly Income vs Expenses
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) =>
              value.toLocaleString('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                minimumFractionDigits: 2,
              })
            }
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            name="Income"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            name="Expenses"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
