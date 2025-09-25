'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Package, Calculator, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import type { LinenCategory } from '@/types/database';

interface LinenCountItem {
  category: LinenCategory;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
  subtotal: number;
  discrepancy_details?: string;
}

interface LinenCountGridProps {
  categories: LinenCategory[];
  onItemsChange: (items: LinenCountItem[]) => void;
  isLoading?: boolean;
  error?: string;
}

export interface LinenCountGridRef {
  getItems: () => LinenCountItem[];
}

const LinenCountGrid = forwardRef<LinenCountGridRef, LinenCountGridProps>(({
  categories,
  onItemsChange,
  isLoading = false,
  error
}, ref) => {
  const [items, setItems] = useState<LinenCountItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const onItemsChangeRef = useRef(onItemsChange);

  // Update the ref when the callback changes
  useEffect(() => {
    onItemsChangeRef.current = onItemsChange;
  }, [onItemsChange]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getItems: () => items
  }), [items]);

  // Initialize items when categories change
  useEffect(() => {
    const initialItems: LinenCountItem[] = categories.map(category => ({
      category,
      quantity_sent: 0,
      quantity_received: 0,
      price_per_item: category.price_per_item,
      subtotal: 0,
      discrepancy_details: '',
    }));
    setItems(initialItems);
    // Don't notify parent during initialization - only on user interaction
  }, [categories]);

  // Notify parent when items change (but not during initialization)
  useEffect(() => {
    if (items.length > 0) {
      onItemsChangeRef.current(items);
    }
  }, [items]);


  // Validate quantity input
  const validateQuantity = (value: string): boolean => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      return false;
    }
    if (num > 10000) {
      return false;
    }
    return true;
  };

  // Handle quantity change
  const handleQuantityChange = (categoryId: string, field: 'sent' | 'received', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    
    // Validate input
    if (value !== '' && !validateQuantity(value)) {
      setValidationErrors(prev => ({
        ...prev,
        [`${categoryId}-${field}`]: `Invalid quantity. Must be 0-10,000`
      }));
      return;
    }

    // Clear validation error
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${categoryId}-${field}`];
      return newErrors;
    });

    // Update items
    setItems(prev => {
      const newItems = prev.map(item => {
        if (item.category.id === categoryId) {
          const updatedItem = { ...item };
          
          if (field === 'sent') {
            updatedItem.quantity_sent = numValue;
            // Auto-set received to sent if received is 0
            if (updatedItem.quantity_received === 0) {
              updatedItem.quantity_received = numValue;
            }
          } else {
            updatedItem.quantity_received = numValue;
          }
          
          // Calculate subtotal
          updatedItem.subtotal = updatedItem.quantity_received * updatedItem.price_per_item;
          
          return updatedItem;
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle discrepancy details change
  const handleDiscrepancyDetailsChange = (categoryId: string, value: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          return {
            ...item,
            discrepancy_details: value,
          };
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Use SSR-safe currency formatting

  // Get total quantities
  const getTotals = () => {
    const totalSent = items.reduce((sum, item) => sum + item.quantity_sent, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsWithQuantity = items.filter(item => item.quantity_sent > 0).length;
    
    return { totalSent, totalReceived, totalAmount, itemsWithQuantity };
  };

  const totals = getTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span>Linen Count & Pricing</span>
        </CardTitle>
        <CardDescription>
          Enter quantities for each linen category. Prices are fixed from category settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totals.totalSent}</p>
            <p className="text-sm text-slate-600">Total Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totals.totalReceived}</p>
            <p className="text-sm text-slate-600">Total Received</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totals.itemsWithQuantity}</p>
            <p className="text-sm text-slate-600">Categories Used</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrencySSR(totals.totalAmount)}</p>
            <p className="text-sm text-slate-600">Total Amount</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Linen Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-10 bg-slate-200 rounded"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const hasDiscrepancy = item.quantity_sent !== item.quantity_received;
              const hasQuantity = item.quantity_sent > 0;
              
              return (
                <div
                  key={item.category.id}
                  className={`p-4 border rounded-lg transition-all ${
                    hasDiscrepancy ? 'border-orange-200 bg-orange-50' :
                    hasQuantity ? 'border-blue-200 bg-blue-50' :
                    'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Category Name */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-900 text-sm leading-tight">
                        {item.category.name}
                      </h4>
                      {hasDiscrepancy && (
                        <Badge variant="destructive" className="text-xs">
                          Discrepancy
                        </Badge>
                      )}
                      {hasQuantity && !hasDiscrepancy && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>

                    {/* Price Display */}
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">
                        Price: {formatCurrencySSR(item.price_per_item)}
                      </span>
                    </div>

                    {/* Quantity Inputs */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">
                          Quantity Sent
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="10000"
                          value={item.quantity_sent || ''}
                          onChange={(e) => handleQuantityChange(item.category.id, 'sent', e.target.value)}
                          placeholder="0"
                          className={`text-sm ${
                            validationErrors[`${item.category.id}-sent`] ? 'border-red-300' : ''
                          }`}
                        />
                        {validationErrors[`${item.category.id}-sent`] && (
                          <p className="text-xs text-red-600">
                            {validationErrors[`${item.category.id}-sent`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">
                          Quantity Received
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="10000"
                          value={item.quantity_received || ''}
                          onChange={(e) => handleQuantityChange(item.category.id, 'received', e.target.value)}
                          placeholder="0"
                          className={`text-sm ${
                            validationErrors[`${item.category.id}-received`] ? 'border-red-300' : ''
                          }`}
                        />
                        {validationErrors[`${item.category.id}-received`] && (
                          <p className="text-xs text-red-600">
                            {validationErrors[`${item.category.id}-received`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Price per Item</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1000"
                            value={item.price_per_item || ''}
                            readOnly
                            placeholder="0.00"
                            className="text-sm bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200 pr-8"
                          />
                          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500 italic">
                          Price is set from category settings
                        </p>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Subtotal:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrencySSR(item.subtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancy Warning and Details */}
                    {hasDiscrepancy && (
                      <div className="space-y-3">
                        <div className="p-2 bg-orange-100 border border-orange-200 rounded text-xs">
                          <p className="text-orange-800">
                            <strong>Discrepancy:</strong> {item.quantity_sent} sent, {item.quantity_received} received
                            ({item.quantity_sent - item.quantity_received > 0 ? '+' : ''}{item.quantity_sent - item.quantity_received})
                          </p>
                        </div>
                        
                        {/* Discrepancy Details Input */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">
                            What caused this discrepancy?
                          </label>
                          <Textarea
                            placeholder="e.g., Items damaged during washing, items lost, incorrect count..."
                            value={item.discrepancy_details || ''}
                            onChange={(e) => handleDiscrepancyDetailsChange(item.category.id, e.target.value)}
                            className="text-xs min-h-[60px] resize-none"
                            maxLength={500}
                          />
                          <p className="text-xs text-slate-500">
                            {(item.discrepancy_details || '').length}/500 characters
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Items Warning */}
        {totals.itemsWithQuantity === 0 && !isLoading && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>No items have been added to this batch. Please enter quantities for at least one category.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LinenCountGrid.displayName = 'LinenCountGrid';

export default LinenCountGrid;
