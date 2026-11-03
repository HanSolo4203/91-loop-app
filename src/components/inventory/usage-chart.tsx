'use client';

import { useMemo } from 'react';
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
import type { UsageByDayRow } from '@/lib/services/inventory';
import { eachIsoDate, formatDayTick, formatLitres } from '@/components/inventory/stock-display';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c'];

interface UsageChartProps {
  rows: UsageByDayRow[];
  from: string;
  to: string;
  productId?: string;
}

interface ChartPoint {
  date: string;
  label: string;
  [productId: string]: string | number;
}

export default function UsageChart({ rows, from, to, productId }: UsageChartProps) {
  const model = useMemo(() => {
    const filtered = productId ? rows.filter((row) => row.product_id === productId) : rows;
    const names = new Map<string, string>();
    for (const row of filtered) {
      names.set(row.product_id, row.product_name);
    }
    const products = [...names.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], 'en', { sensitivity: 'base' })
    );
    const span = eachIsoDate(from, to);
    const days =
      span.length > 0 && span.length <= 62
        ? span
        : [...new Set(filtered.map((row) => row.shift_date))].sort();
    const byDay = new Map<string, Map<string, number>>();
    for (const row of filtered) {
      const bucket = byDay.get(row.shift_date) ?? new Map<string, number>();
      bucket.set(row.product_id, (bucket.get(row.product_id) ?? 0) + row.litres);
      byDay.set(row.shift_date, bucket);
    }
    const data: ChartPoint[] = days.map((date) => {
      const point: ChartPoint = { date, label: formatDayTick(date) };
      const bucket = byDay.get(date);
      for (const [id] of products) {
        point[id] = bucket?.get(id) ?? 0;
      }
      return point;
    });
    return { products, data };
  }, [rows, from, to, productId]);

  if (model.products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">No usage in this date range.</p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={model.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#475569' }}
            interval={model.data.length > 20 ? 'preserveStartEnd' : 0}
          />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} width={48} />
          <Tooltip formatter={(value) => formatLitres(Number(value))} />
          <Legend />
          {model.products.map(([id, name], index) => (
            <Bar
              key={id}
              dataKey={id}
              name={name}
              stackId="used"
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
