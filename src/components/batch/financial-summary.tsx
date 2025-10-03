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
  Download
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
      <CardContent className="space-y-6">
        {/* Total Amount */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 font-medium">Total Batch Value</p>
              <p className="text-3xl font-bold text-green-800">
                {formatCurrency(financial_summary.total_amount)}
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Items Sent</span>
              </div>
              <span className="font-semibold">{formatNumber(financial_summary.total_items_sent)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Items Received</span>
              </div>
              <span className="font-semibold">{formatNumber(financial_summary.total_items_received)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Avg. Item Price</span>
              </div>
              <span className="font-semibold">{formatCurrency(financial_summary.average_item_price)}</span>
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
                <span className="text-sm font-medium text-slate-700">Item Discrepancy</span>
              </div>
              <span className={`font-semibold ${
                totalItemsDiscrepancy > 0 ? 'text-red-600' : 
                totalItemsDiscrepancy < 0 ? 'text-green-600' : 'text-slate-900'
              }`}>
                {totalItemsDiscrepancy > 0 ? '-' : totalItemsDiscrepancy < 0 ? '+' : ''}
                {Math.abs(totalItemsDiscrepancy)}
              </span>
            </div>
          </div>
        </div>

        {/* VAT Summary */}
        <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Subtotal</span>
            <span className="font-semibold">{formatCurrency(financial_summary.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">VAT (15%)</span>
            <span className="font-semibold">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium text-slate-900">Total incl. VAT</span>
            <span className="text-lg font-bold text-slate-900">{formatCurrency(totalInclVat)}</span>
          </div>
        </div>

        {/* Discrepancy Analysis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <DiscrepancyIcon className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium text-slate-700">Discrepancy Status</p>
                <Badge className={discrepancyStatus.className}>
                  {discrepancyStatus.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">
                {financial_summary.discrepancy_count} of {financial_summary.total_items_sent} items
              </p>
              <p className="font-semibold text-slate-900">
                {financial_summary.discrepancy_percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {financial_summary.discrepancy_percentage > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Discrepancy Impact
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {Math.abs(totalItemsDiscrepancy)} item{Math.abs(totalItemsDiscrepancy) !== 1 ? 's' : ''} discrepancy 
                    {discrepancyValue !== 0 && (
                      <span> worth {formatCurrency(Math.abs(discrepancyValue))}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onGenerateInvoice}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Invoice</span>
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center justify-center space-x-2"
              onClick={onGenerateInvoice}
            >
              <FileText className="w-4 h-4" />
              <span>View Invoice</span>
            </Button>
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500">
              Batch ID: {paperBatchId} • System ID: #{batchId.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
