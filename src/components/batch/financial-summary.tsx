'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface FinancialSummaryProps {
  financial_summary: {
    total_amount: number;
    total_items_sent: number;
    total_items_received: number;
    discrepancy_count: number;
    discrepancy_percentage: number;
    average_item_price: number;
  };
  batchId: string;
  paperBatchId: string;
  onGenerateInvoice?: () => void;
  loading?: boolean;
}

export default function FinancialSummary({ 
  financial_summary, 
  batchId, 
  paperBatchId,
  onGenerateInvoice,
  loading = false 
}: FinancialSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getDiscrepancyStatus = () => {
    if (financial_summary.discrepancy_percentage === 0) {
      return {
        label: 'Perfect Match',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle
      };
    } else if (financial_summary.discrepancy_percentage <= 5) {
      return {
        label: 'Minor Discrepancy',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle
      };
    } else {
      return {
        label: 'Significant Discrepancy',
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle
      };
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded"></div>
            ))}
          </div>
          <div className="mt-6 h-10 w-full bg-slate-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const discrepancyStatus = getDiscrepancyStatus();
  const DiscrepancyIcon = discrepancyStatus.icon;

  // Calculate derived values
  const totalItemsDiscrepancy = financial_summary.total_items_sent - financial_summary.total_items_received;
  const discrepancyValue = totalItemsDiscrepancy * financial_summary.average_item_price;
  const vatRate = 0.15;
  const vatAmount = Math.round(financial_summary.total_amount * vatRate * 100) / 100;
  const totalInclVat = Math.round((financial_summary.total_amount + vatAmount) * 100) / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span>Financial Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount - Compact */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 font-medium text-sm">Total Batch Value</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(financial_summary.total_amount)}
              </p>
            </div>
            <div className="p-2 bg-green-200 rounded-full">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
          </div>
        </div>

        {/* Key Metrics - Full Width Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Items Sent</span>
            </div>
            <span className="font-semibold text-sm">{formatNumber(financial_summary.total_items_sent)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Items Received</span>
            </div>
            <span className="font-semibold text-sm">{formatNumber(financial_summary.total_items_received)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Avg. Price</span>
            </div>
            <span className="font-semibold text-sm">{formatCurrency(financial_summary.average_item_price)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {totalItemsDiscrepancy > 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : totalItemsDiscrepancy < 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm font-medium text-slate-700">Discrepancy</span>
            </div>
            <span className={`font-semibold text-sm ${
              totalItemsDiscrepancy > 0 ? 'text-red-600' : 
              totalItemsDiscrepancy < 0 ? 'text-green-600' : 'text-slate-900'
            }`}>
              {totalItemsDiscrepancy > 0 ? '-' : totalItemsDiscrepancy < 0 ? '+' : ''}
              {Math.abs(totalItemsDiscrepancy)}
            </span>
          </div>
        </div>

        {/* VAT Summary - Compact */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border text-center">
          <div>
            <p className="text-xs text-slate-600">Subtotal</p>
            <p className="text-sm font-semibold">{formatCurrency(financial_summary.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">VAT (15%)</p>
            <p className="text-sm font-semibold">{formatCurrency(vatAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Total incl. VAT</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(totalInclVat)}</p>
          </div>
        </div>

        {/* Discrepancy Analysis - Compact */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <DiscrepancyIcon className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Discrepancy Status</span>
            </div>
            <Badge className={discrepancyStatus.className}>
              {discrepancyStatus.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {financial_summary.discrepancy_count} of {financial_summary.total_items_sent} items
            </span>
            <span className="font-semibold text-slate-900">
              {financial_summary.discrepancy_percentage.toFixed(1)}%
            </span>
          </div>
          {financial_summary.discrepancy_percentage > 0 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-amber-800">
                  {Math.abs(totalItemsDiscrepancy)} item{Math.abs(totalItemsDiscrepancy) !== 1 ? 's' : ''} discrepancy 
                  {discrepancyValue !== 0 && (
                    <span> worth {formatCurrency(Math.abs(discrepancyValue))}</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Compact */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex gap-2">
            <Button 
              onClick={onGenerateInvoice}
              size="sm"
              className="flex-1 flex items-center justify-center space-x-1"
            >
              <FileText className="w-3 h-3" />
              <span className="text-xs">Generate Invoice</span>
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center justify-center space-x-1"
              onClick={() => window.open(`/invoice/${batchId}`, '_blank')}
            >
              <FileText className="w-3 h-3" />
              <span className="text-xs">View Invoice</span>
            </Button>
          </div>
          
          <div className="mt-2 text-center">
            <p className="text-xs text-slate-500">
              Batch ID: {paperBatchId} • System ID: #{batchId.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
