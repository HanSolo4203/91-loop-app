'use client';

import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface RfidItem {
  id: string;
  rfid_number: string;
  category: string;
  total_washes_lifetime: number;
  washes_remaining: number;
  status: 'active' | 'near_end' | 'retired';
}

interface BatchForChart {
  scan_date: string;
  total_washes: number;
}

interface LinenHealthSectionProps {
  items: RfidItem[];
  batches30Days?: BatchForChart[];
  categoryFilter?: string;
  statusFilter?: string;
}

const COLORS = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

export default function LinenHealthSection({
  items,
  batches30Days = [],
  categoryFilter,
  statusFilter,
}: LinenHealthSectionProps) {
  const greenCount = items.filter((i) => i.washes_remaining > 200).length;
  const amberCount = items.filter((i) => i.washes_remaining >= 50 && i.washes_remaining <= 200).length;
  const redCount = items.filter((i) => i.washes_remaining < 50).length;

  const lifecycleData = [
    { name: '>200 remaining', value: greenCount, fill: COLORS.green },
    { name: '50-200 remaining', value: amberCount, fill: COLORS.amber },
    { name: '<50 (near end)', value: redCount, fill: COLORS.red },
  ].filter((d) => d.value > 0);

  let filteredItems = items;
  if (categoryFilter) {
    filteredItems = filteredItems.filter((i) => i.category === categoryFilter);
  }
  if (statusFilter) {
    filteredItems = filteredItems.filter((i) => i.status === statusFilter);
  }

  // Sort: near end first, then by washes_remaining asc
  filteredItems = [...filteredItems].sort((a, b) => {
    if (a.washes_remaining < 50 && b.washes_remaining >= 50) return -1;
    if (a.washes_remaining >= 50 && b.washes_remaining < 50) return 1;
    return a.washes_remaining - b.washes_remaining;
  });

  const getStatusBadge = (item: RfidItem) => {
    if (item.washes_remaining < 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Replace Soon
        </span>
      );
    }
    if (item.washes_remaining <= 200) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Amber
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Healthy
      </span>
    );
  };

  const getLifecycleColor = (washesRemaining: number) => {
    if (washesRemaining < 50) return 'bg-red-500';
    if (washesRemaining <= 200) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Linen Health</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Lifecycle Status (Donut)</h3>
          {lifecycleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={lifecycleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(e) => `${e.name}: ${e.value}`}
                >
                  {lifecycleData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No items yet</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Washes per Batch (Last 30 days)</h3>
          {batches30Days.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={batches30Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scan_date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total_washes" fill="#3b82f6" name="Total Washes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No batch data yet</p>
          )}
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">RFID Items</h3>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">RFID Number</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Total Washes</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Washes Remaining</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">Lifecycle Bar</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => {
                  const used = item.total_washes_lifetime;
                  const pct = Math.min(100, Math.round((used / 500) * 100));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-900">{item.rfid_number}</td>
                      <td className="px-3 py-2 text-slate-700">{item.category}</td>
                      <td className="px-3 py-2 text-right font-medium">{item.total_washes_lifetime}</td>
                      <td className="px-3 py-2 text-right font-medium">{item.washes_remaining}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getLifecycleColor(item.washes_remaining)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{used}/500</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{getStatusBadge(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {filteredItems.length === 0 && (
          <p className="text-center py-8 text-slate-500">No RFID items found</p>
        )}
      </Card>
    </div>
  );
}
