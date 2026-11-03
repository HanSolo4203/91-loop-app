'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatQuantity, type StockUnit } from '@/components/inventory/stock-display';

export interface OnHandPoint {
  date: string;
  label: string;
  on_hand: number;
}

export default function OnHandChart({
  points,
  unit = 'L',
}: {
  points: OnHandPoint[];
  unit?: StockUnit;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No stock history in this range.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#475569' }}
            interval={points.length > 16 ? 'preserveStartEnd' : 0}
          />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} width={48} />
          <Tooltip formatter={(value) => formatQuantity(Number(value), unit)} />
          <Line
            type="monotone"
            dataKey="on_hand"
            name="On hand"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
