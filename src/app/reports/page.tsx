'use client';

import Navigation from '@/components/navigation';
import ReportsTable from '@/components/dashboard/reports-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
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

        <ReportsTable />
      </div>
    </div>
  );
}


