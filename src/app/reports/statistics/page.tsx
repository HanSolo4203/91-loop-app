'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface StatisticsData {
  period: {
    year: number;
    month: number;
    month_name: string;
  };
  summary: {
    total_clients: number;
    total_items_washed: number;
    total_revenue_before_vat: number;
    total_vat_amount: number;
    total_revenue_incl_vat: number;
    total_batches: number;
    total_discrepancies: number;
    discrepancy_rate: number;
    average_batch_value: number;
    average_items_per_batch: number;
  };
  top_client: {
    client_name: string;
    total_amount: number;
  };
  client_details: Array<{
    client_name: string;
    total_amount: number;
    total_items_washed: number;
    batch_count: number;
    discrepancy_rate: number;
    batches: Array<{
      id: string;
      paper_batch_id: string;
      pickup_date: string;
      status: string;
      items_sent: number;
      items_received: number;
      amount: number;
      discrepancy: number;
    }>;
  }>;
  generated_at: string;
}

export default function StatisticsPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month');
  
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboard/reports/pdf-stats?month=${month}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load statistics');
        }
      } catch (err) {
        setError('Failed to load statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (month) {
      fetchStats();
    }
  }, [month]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading statistics</p>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link href="/reports">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center space-x-4">
            <Link href="/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handlePrint} className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Print Statistics</span>
            </Button>
          </div>
        </div>

        {/* Logo and Title */}
        <div className="text-center mb-8 border-b-2 border-blue-100 pb-8">
          <img 
            src="https://bwuslachnnapmtenbdgq.supabase.co/storage/v1/object/public/business-logos/rsl_dynamic_italic_final444.svg" 
            alt="RSL Express Logo" 
            className="h-20 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Monthly Statistics Report</h1>
          <p className="text-xl text-slate-700">{data.period.month_name}</p>
          <p className="text-sm text-slate-500 mt-2">
            Generated on {new Date(data.generated_at).toLocaleDateString()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
                <Users className="w-4 h-4 mr-2" />
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_clients}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
                <Package className="w-4 h-4 mr-2" />
                Items Washed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.total_items_washed.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Total Revenue (incl. VAT)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrencySSR(data.summary.total_revenue_incl_vat)}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Discrepancy Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{data.summary.discrepancy_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Batches Processed:</span>
                <span className="font-semibold">{data.summary.total_batches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Average Batch Value:</span>
                <span className="font-semibold">{formatCurrencySSR(data.summary.average_batch_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Average Items per Batch:</span>
                <span className="font-semibold">{data.summary.average_items_per_batch.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Discrepancies:</span>
                <span className="font-semibold text-orange-600">{data.summary.total_discrepancies}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                VAT Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Revenue before VAT:</span>
                <span className="font-semibold">{formatCurrencySSR(data.summary.total_revenue_before_vat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">VAT Amount (15%):</span>
                <span className="font-semibold text-blue-600">{formatCurrencySSR(data.summary.total_vat_amount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-900 font-medium">Total Revenue (incl. VAT):</span>
                <span className="font-bold text-green-600">{formatCurrencySSR(data.summary.total_revenue_incl_vat)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Top Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 mb-2">{data.top_client.client_name}</div>
                <div className="text-2xl font-bold text-blue-600">{formatCurrencySSR(data.top_client.total_amount)}</div>
                <div className="text-sm text-slate-500 mt-2">Highest Revenue Client</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Client Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left py-3 px-4 font-semibold">Client Name</th>
                    <th className="text-right py-3 px-4 font-semibold">Revenue (excl. VAT)</th>
                    <th className="text-right py-3 px-4 font-semibold">VAT Amount</th>
                    <th className="text-right py-3 px-4 font-semibold">Total (incl. VAT)</th>
                    <th className="text-right py-3 px-4 font-semibold">Items</th>
                    <th className="text-right py-3 px-4 font-semibold">Batches</th>
                    <th className="text-right py-3 px-4 font-semibold">Discrepancy Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.client_details.map((client, index) => {
                    const vatAmount = Math.round(client.total_amount * 0.15 * 100) / 100;
                    const totalInclVat = Math.round((client.total_amount + vatAmount) * 100) / 100;
                    return (
                      <tr key={client.client_name} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                        <td className="py-3 px-4 font-medium text-slate-900">{client.client_name}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrencySSR(client.total_amount)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-600">{formatCurrencySSR(vatAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">{formatCurrencySSR(totalInclVat)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{client.total_items_washed.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{client.batch_count}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          client.discrepancy_rate > 5 ? 'text-red-600' : 
                          client.discrepancy_rate > 2 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {client.discrepancy_rate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-6">
          <p>RSL Express - Professional Laundry Services</p>
          <p>Cape Town, South Africa</p>
        </div>
      </div>
    </div>
  );
}
