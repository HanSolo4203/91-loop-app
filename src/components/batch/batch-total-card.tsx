'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  DollarSign, 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import type { LinenCountItem } from '@/components/batch/linen-count-grid';

interface BatchTotalCardProps {
  items: LinenCountItem[];
  paperBatchId: string;
  clientName?: string;
  pickupDate?: string;
  status?: 'draft' | 'ready' | 'creating' | 'success' | 'error';
  errorMessage?: string;
  onStatusChange?: (status: 'draft' | 'ready' | 'creating' | 'success' | 'error') => void;
  mode?: 'create' | 'edit';
}

export default function BatchTotalCard({
  items,
  paperBatchId,
  clientName,
  pickupDate,
  status = 'draft',
  errorMessage,
  mode = 'create'
}: BatchTotalCardProps) {
  const copy = mode === 'edit'
    ? {
        description: 'Review batch details and totals before amending',
        readyMessage: 'Batch is ready to be amended. All required information has been provided.',
        successMessage: 'Batch updated successfully! Redirecting to batch details...',
        mainHeading: 'Batch Summary',
        totalLabel: 'Total Amount',
        totalSubTextPrefix: '',
        draftLabel: 'Pending Changes',
        readyLabel: 'Ready to Amend',
        creatingLabel: 'Updating...',
        successLabel: 'Amended',
        errorLabel: 'Error',
      }
    : {
        description: 'Review batch details and totals before creating',
        readyMessage: 'Batch is ready to be created. All required information has been provided.',
        successMessage: 'Batch created successfully! Redirecting to batch details...',
        mainHeading: 'Batch Summary',
        totalLabel: 'Total Amount',
        totalSubTextPrefix: '',
        draftLabel: 'Draft',
        readyLabel: 'Ready to Create',
        creatingLabel: 'Creating...',
        successLabel: 'Created Successfully',
        errorLabel: 'Error',
      };

  // Calculate totals and statistics
  const calculateTotals = () => {
    const totalSent = items.reduce((sum, item) => sum + item.quantity_sent, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsWithQuantity = items.filter(item => item.quantity_sent > 0).length;
    const itemsWithDiscrepancy = items.filter(item => 
      item.quantity_sent > 0 && item.quantity_sent !== item.quantity_received
    ).length;
    
    // Calculate average price
    const totalItems = items.reduce((sum, item) => sum + item.quantity_received, 0);
    const averagePrice = totalItems > 0 ? totalAmount / totalItems : 0;
    
    // Find highest and lowest priced items
    const itemsWithPrices = items.filter(item => item.quantity_received > 0);
    const highestPrice = itemsWithPrices.length > 0 ? 
      Math.max(...itemsWithPrices.map(item => item.price_per_item)) : 0;
    const lowestPrice = itemsWithPrices.length > 0 ? 
      Math.min(...itemsWithPrices.map(item => item.price_per_item)) : 0;
    
    return {
      totalSent,
      totalReceived,
      totalAmount,
      itemsWithQuantity,
      itemsWithDiscrepancy,
      averagePrice,
      highestPrice,
      lowestPrice,
      totalItems
    };
  };

  const totals = calculateTotals();

  // Format currency (SSR-safe)
  const formatCurrency = (amount: number): string => formatCurrencySSR(amount);

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="text-xs">{copy.draftLabel}</Badge>;
      case 'ready':
        return <Badge variant="default" className="text-xs bg-green-600">{copy.readyLabel}</Badge>;
      case 'creating':
        return <Badge variant="default" className="text-xs bg-blue-600">{copy.creatingLabel}</Badge>;
      case 'success':
        return <Badge variant="default" className="text-xs bg-green-600">{copy.successLabel}</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">{copy.errorLabel}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{copy.draftLabel}</Badge>;
    }
  };


  // Check if batch is ready to create
  const isReadyToCreate = () => {
    return (
      clientName &&
      pickupDate &&
      totals.itemsWithQuantity > 0 &&
      totals.totalAmount > 0
    );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span>{copy.mainHeading}</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          {copy.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Paper Batch ID:</span>
            <span className="text-sm font-mono text-slate-900">
              {paperBatchId || 'Not specified'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Client:</span>
            <span className="text-sm text-slate-900">
              {clientName || 'Not selected'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Pickup Date:</span>
            <span className="text-sm text-slate-900">
              {pickupDate ? new Date(pickupDate).toLocaleDateString() : 'Not specified'}
            </span>
          </div>
        </div>

        {/* Main Total Display */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">{copy.totalLabel}</span>
            </div>
            <p className="text-4xl font-bold text-blue-900">{formatCurrency(totals.totalAmount)}</p>
            <p className="text-sm text-blue-600 mt-1">
              {totals.totalItems} items across {totals.itemsWithQuantity} categories
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Package className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Sent</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{totals.totalSent}</p>
          </div>

          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-600">Received</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{totals.totalReceived}</p>
          </div>

          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Categories</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{totals.itemsWithQuantity}</p>
          </div>

          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Calculator className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Avg Price</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.averagePrice)}</p>
          </div>
        </div>

        {/* Price Range */}
        {totals.itemsWithQuantity > 1 && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Price Range</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-600">Lowest:</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(totals.lowestPrice)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                <span className="text-sm text-slate-600">Highest:</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(totals.highestPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Discrepancies Warning */}
        {totals.itemsWithDiscrepancy > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h4 className="text-sm font-medium text-orange-800">Discrepancies Detected</h4>
            </div>
            <p className="text-sm text-orange-700">
              {totals.itemsWithDiscrepancy} category{totals.itemsWithDiscrepancy > 1 ? 'ies' : 'y'} have quantity discrepancies between sent and received items.
            </p>
          </div>
        )}

        {/* Status Messages */}
        {status === 'error' && errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">
                {copy.successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Ready Status */}
        {isReadyToCreate() && status === 'draft' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">
                {copy.readyMessage}
              </p>
            </div>
          </div>
        )}

        {/* Missing Information Warning */}
        {!isReadyToCreate() && status === 'draft' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h4 className="text-sm font-medium text-yellow-800">Missing Information</h4>
            </div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {/* Paper Batch ID is optional; generated by database when blank */}
              {!clientName && <li>• Client must be selected</li>}
              {!pickupDate && <li>• Pickup date must be specified</li>}
              {totals.itemsWithQuantity === 0 && <li>• At least one category must have quantities</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
