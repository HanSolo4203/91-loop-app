'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navigation from '@/components/navigation';
import { FileSpreadsheet } from 'lucide-react';

// Lazy load heavy components - only loaded when needed
const ReportsTable = dynamic(() => import('@/components/dashboard/reports-table'), {
  loading: () => <div className="p-8 text-center text-slate-500">Loading reports...</div>,
  ssr: false,
});

const ReportsAnalytics = dynamic(() => import('@/components/dashboard/reports-analytics'), {
  loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
    ))}
  </div>,
  ssr: false,
});

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState<number | null>(now.getMonth());
  const [year, setYear] = useState<number>(now.getFullYear());

  const handleMonthYearChange = (m: number | null, y: number) => {
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            <span>Reports</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Invoicing summary per client filtered by month, including total items washed,
            total amount, and discrepancy information.
          </p>
        </div>

        {/* Analytics Cards */}
        <ReportsAnalytics month={month} year={year} />

        {/* Reports Table */}
        <ReportsTable 
          month={month} 
          year={year} 
          onMonthYearChange={handleMonthYearChange}
        />
      </div>
    </div>
  );
}


