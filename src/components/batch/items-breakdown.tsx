'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';

interface BatchItem {
  id: string;
  linen_category_id: string;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
  discrepancy_details?: string;
  category: {
    id: string;
    name: string;
    description?: string;
    unit_price: number;
    is_active: boolean;
  };
  discrepancy: {
    quantity: number;
    percentage: number;
    value_impact: number;
  };
  pricing: {
    unit_price: number;
    total_sent_value: number;
    total_received_value: number;
    discrepancy_value: number;
  };
}

interface ItemsBreakdownProps {
  items: BatchItem[];
  loading?: boolean;
}

export default function ItemsBreakdown({ items, loading = false }: ItemsBreakdownProps) {
  const formatCurrency = (amount: number) => formatCurrencySSR(amount);

  const getDiscrepancyIcon = (discrepancy: number) => {
    if (discrepancy > 0) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (discrepancy < 0) {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getDiscrepancyBadge = (discrepancy: number) => {
    if (discrepancy > 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Missing {discrepancy}
        </Badge>
      );
    } else if (discrepancy < 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Extra {Math.abs(discrepancy)}
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-800 border-slate-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Match
      </Badge>
    );
  };

  const getRowClassName = (discrepancy: number) => {
    if (discrepancy > 0) {
      return 'bg-red-50 hover:bg-red-100';
    } else if (discrepancy < 0) {
      return 'bg-green-50 hover:bg-green-100';
    }
    return 'hover:bg-slate-50';
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Items Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No items found
            </h3>
            <p className="text-slate-500">
              This batch doesn&apos;t have any items yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalItems = items.length;
  const itemsWithDiscrepancy = items.filter(item => item.discrepancy.quantity !== 0).length;
  const totalSent = items.reduce((sum, item) => sum + item.quantity_sent, 0);
  const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
  const totalDiscrepancyValue = items.reduce((sum, item) => sum + item.pricing.discrepancy_value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Items Breakdown</span>
          </div>
          <div className="text-sm text-slate-600">
            {totalItems} item{totalItems !== 1 ? 's' : ''} • {itemsWithDiscrepancy} discrepancy{itemsWithDiscrepancy !== 1 ? 'ies' : ''}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Discrepancy Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow 
                  key={item.id}
                  className={getRowClassName(item.discrepancy.quantity)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.category.name}</div>
                      {item.category.description && (
                        <div className="text-sm text-slate-500">
                          {item.category.description}
                        </div>
                      )}
                      {item.discrepancy.quantity !== 0 && (
                        <div className="flex items-center space-x-2">
                          {getDiscrepancyIcon(item.discrepancy.quantity)}
                          <span className="text-xs text-slate-600">
                            {item.discrepancy.percentage > 0 ? '+' : ''}{item.discrepancy.percentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(
                      Number.isFinite(item.pricing?.unit_price)
                        ? (item.pricing as any).unit_price
                        : (item.price_per_item ?? item.category.unit_price ?? 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{item.quantity_sent}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="font-medium">{item.quantity_received}</span>
                      {item.discrepancy.quantity !== 0 && (
                        <span className={`text-xs ${
                          item.discrepancy.quantity > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.discrepancy.quantity > 0 ? '-' : '+'}{Math.abs(item.discrepancy.quantity)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getDiscrepancyBadge(item.discrepancy.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(item.pricing.total_sent_value)}
                      </div>
                      {item.discrepancy.value_impact !== 0 && (
                        <div className={`text-xs ${
                          item.discrepancy.value_impact > 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {item.discrepancy.value_impact > 0 ? '-' : '+'}{formatCurrency(Math.abs(item.discrepancy.value_impact))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Discrepancy Details */}
                  <TableCell>
                    <div className="max-w-xs">
                      {item.discrepancy_details ? (
                        <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border">
                          <p className="font-medium text-xs text-slate-600 mb-1">Details:</p>
                          <p className="text-xs leading-relaxed">{item.discrepancy_details}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No details provided</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-slate-600">Total Items Sent</p>
              <p className="font-semibold text-lg">{totalSent.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Total Items Received</p>
              <p className="font-semibold text-lg">{totalReceived.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Items with Discrepancy</p>
              <p className="font-semibold text-lg text-red-600">
                {itemsWithDiscrepancy} ({((itemsWithDiscrepancy / totalItems) * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Discrepancy Value</p>
              <p className={`font-semibold text-lg ${
                totalDiscrepancyValue > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {totalDiscrepancyValue > 0 ? '-' : '+'}{formatCurrency(Math.abs(totalDiscrepancyValue))}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
