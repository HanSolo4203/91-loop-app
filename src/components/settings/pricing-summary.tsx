'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calculator,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { LinenCategory } from '@/types/database';

interface PricingSummaryProps {
  categories: LinenCategory[];
  updatedPrices: Record<string, number>;
  hasChanges: boolean;
  isUpdating: boolean;
  lastUpdated?: string;
}

export default function PricingSummary({
  categories,
  updatedPrices,
  hasChanges,
  isUpdating,
  lastUpdated,
}: PricingSummaryProps) {
  // Calculate current statistics
  const calculateStats = () => {
    const activeCategories = categories.filter(cat => cat.is_active);
    const prices = activeCategories.map(cat => {
      const updatedPrice = updatedPrices[cat.id];
      return updatedPrice !== undefined ? updatedPrice : cat.price_per_item;
    });

    if (prices.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        totalValue: 0,
        changedCount: 0,
        totalChange: 0,
        averageChange: 0,
      };
    }

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const total = prices.reduce((sum, price) => sum + price, 0);
    const average = total / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const median = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];

    // Calculate changes
    const changedCount = Object.keys(updatedPrices).length;
    const totalChange = Object.entries(updatedPrices).reduce((sum, [id, newPrice]) => {
      const originalPrice = categories.find(cat => cat.id === id)?.price_per_item || 0;
      return sum + (newPrice - originalPrice);
    }, 0);
    const averageChange = changedCount > 0 ? totalChange / changedCount : 0;

    return {
      total: prices.length,
      average,
      min,
      max,
      median,
      totalValue: total,
      changedCount,
      totalChange,
      averageChange,
    };
  };

  const stats = calculateStats();

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };


  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-red-600';
    if (value < 0) return 'text-green-600';
    return 'text-slate-600';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < 0) return <TrendingDown className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <span>Pricing Summary</span>
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {stats.changedCount} changed
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time statistics for all linen category pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Categories */}
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">categories</p>
          </div>

          {/* Average Price */}
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Average</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatPrice(stats.average)}</p>
            <p className="text-xs text-blue-500">per item</p>
          </div>

          {/* Lowest Price */}
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Lowest</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatPrice(stats.min)}</p>
            <p className="text-xs text-green-500">per item</p>
          </div>

          {/* Highest Price */}
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Highest</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{formatPrice(stats.max)}</p>
            <p className="text-xs text-red-500">per item</p>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Median Price */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Median Price</p>
                <p className="text-lg font-bold text-slate-900">{formatPrice(stats.median)}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>
          </div>

          {/* Total Value */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Value</p>
                <p className="text-lg font-bold text-slate-900">{formatPrice(stats.totalValue)}</p>
              </div>
              <Calculator className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Changes Summary */}
        {hasChanges && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h4 className="font-medium text-orange-900">Pending Changes</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-orange-600">Categories Changed</p>
                <p className="text-xl font-bold text-orange-900">{stats.changedCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-orange-600">Total Change</p>
                <p className={`text-xl font-bold flex items-center justify-center space-x-1 ${getChangeColor(stats.totalChange)}`}>
                  {getChangeIcon(stats.totalChange)}
                  <span>{formatPrice(stats.totalChange)}</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-orange-600">Average Change</p>
                <p className={`text-xl font-bold flex items-center justify-center space-x-1 ${getChangeColor(stats.averageChange)}`}>
                  {getChangeIcon(stats.averageChange)}
                  <span>{formatPrice(stats.averageChange)}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status and Last Updated */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600">Updating prices...</span>
              </>
            ) : hasChanges ? (
              <>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600">Changes pending</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">All prices saved</span>
              </>
            )}
          </div>
          
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
