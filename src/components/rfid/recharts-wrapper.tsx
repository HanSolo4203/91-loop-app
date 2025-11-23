'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '@/components/ui/card';

interface ProcessedData {
  byStatus: Array<{ name: string; value: number }>;
  byCategory: Array<{ name: string; value: number }>;
  byCondition: Array<{ name: string; value: number }>;
  byLocation: Array<{ name: string; value: number }>;
  byAssignedLocation: Array<{ name: string; value: number }>;
  timeSeriesData: Array<{ time: string; count: number }>;
}

interface RechartsWrapperProps {
  processedData: ProcessedData;
  colors: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RechartsWrapper({ processedData, colors = COLORS }: RechartsWrapperProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={processedData.byStatus}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {processedData.byStatus.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData.byCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Condition Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Condition Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={processedData.byCondition}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {processedData.byCondition.map((_, index) => (
                <Cell key={`cell-cond-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Location Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Location</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData.byLocation} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Assigned Location Distribution */}
      {processedData.byAssignedLocation.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Assigned Location</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedData.byAssignedLocation} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Time Series */}
      {processedData.timeSeriesData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Items" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

