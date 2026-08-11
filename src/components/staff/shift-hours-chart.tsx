'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ShiftHoursChartRow {
  name: string;
  regular: number;
  overtime: number;
  total: number;
}

interface ShiftHoursChartProps {
  data: ShiftHoursChartRow[];
}

function ShiftTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const regular = Number(payload.find((p) => p.dataKey === 'regular')?.value ?? 0);
  const overtime = Number(payload.find((p) => p.dataKey === 'overtime')?.value ?? 0);
  const total = Math.round((regular + overtime) * 100) / 100;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900 mb-1">{label}</p>
      <p className="text-slate-600">
        {regular}h regular + {overtime}h overtime = {total}h total
      </p>
    </div>
  );
}

export default function ShiftHoursChart({ data }: ShiftHoursChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        No hours recorded this month
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          angle={-35}
          textAnchor="end"
          interval={0}
          height={70}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#64748b' }}
        />
        <Tooltip content={<ShiftTooltip />} />
        <Legend />
        <Bar dataKey="regular" name="Regular Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="overtime" name="Overtime Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
