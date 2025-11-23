'use client';

import dynamic from 'next/dynamic';

// Dynamic import of Recharts - only loaded when charts are needed
const RechartsCharts = dynamic(() => import('./recharts-wrapper'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-slate-500">
      Loading charts...
    </div>
  ),
});

interface ProcessedData {
  byStatus: Array<{ name: string; value: number }>;
  byCategory: Array<{ name: string; value: number }>;
  byCondition: Array<{ name: string; value: number }>;
  byLocation: Array<{ name: string; value: number }>;
  byAssignedLocation: Array<{ name: string; value: number }>;
  timeSeriesData: Array<{ time: string; count: number }>;
}

interface RFIDChartsProps {
  processedData: ProcessedData;
  colors: string[];
}

export default function RFIDCharts({ processedData, colors }: RFIDChartsProps) {
  return <RechartsCharts processedData={processedData} colors={colors} />;
}

