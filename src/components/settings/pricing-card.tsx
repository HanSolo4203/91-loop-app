'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import type { LinenCategory } from '@/types/database';

interface PricingCardProps {
  category: LinenCategory;
  onPriceChange: (id: string, price: number) => void;
  isUpdating?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export default function PricingCard({
  category,
  onPriceChange,
  isUpdating = false,
  hasError = false,
  errorMessage,
}: PricingCardProps) {
  const [localPrice, setLocalPrice] = useState(category.price_per_item.toString());
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  // Update local price when category prop changes
  useEffect(() => {
    setLocalPrice(category.price_per_item.toString());
  }, [category.price_per_item]);

  // Validate price input
  const validatePrice = (value: string): boolean => {
    const numValue = parseFloat(value);
    
    if (value === '' || isNaN(numValue)) {
      setValidationMessage('Price must be a valid number');
      return false;
    }
    
    if (numValue < 0) {
      setValidationMessage('Price cannot be negative');
      return false;
    }
    
    if (numValue > 1000) {
      setValidationMessage('Price cannot exceed R1000');
      return false;
    }
    
    if (numValue !== Math.round(numValue * 100) / 100) {
      setValidationMessage('Price can have maximum 2 decimal places');
      return false;
    }
    
    setValidationMessage('');
    return true;
  };

  const handlePriceChange = (value: string) => {
    setLocalPrice(value);
    const valid = validatePrice(value);
    setIsValid(valid);
    
    if (valid && value !== '') {
      const numValue = parseFloat(value);
      onPriceChange(category.id, numValue);
    }
  };

  const handleBlur = () => {
    if (localPrice === '') {
      setLocalPrice(category.price_per_item.toString());
      setIsValid(true);
      setValidationMessage('');
    } else if (!isValid) {
      // Reset to original value if invalid
      setLocalPrice(category.price_per_item.toString());
      setIsValid(true);
      setValidationMessage('');
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getPriceChangeIndicator = () => {
    const currentPrice = parseFloat(localPrice);
    const originalPrice = category.price_per_item;
    
    if (isNaN(currentPrice) || currentPrice === originalPrice) {
      return null;
    }
    
    const difference = currentPrice - originalPrice;
    const percentage = ((difference / originalPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          +{formatPrice(difference)} (+{percentage}%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          {formatPrice(difference)} ({percentage}%)
        </Badge>
      );
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      hasError ? 'border-red-200 bg-red-50' : 
      !isValid ? 'border-orange-200 bg-orange-50' :
      isUpdating ? 'border-blue-200 bg-blue-50' : 
      'hover:shadow-md'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Category Name */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900 text-sm leading-tight">
              {category.name}
            </h3>
            {!category.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>

          {/* Current Price Display */}
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              Current: {formatPrice(category.price_per_item)}
            </span>
          </div>

          {/* Price Input */}
          <div className="space-y-1">
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1000"
                value={localPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="0.00"
                className={`${
                  !isValid ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' :
                  hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' :
                  'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                } transition-colors`}
                disabled={isUpdating}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : hasError ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : isValid && localPrice !== category.price_per_item.toString() ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            </div>

            {/* Validation Message */}
            {validationMessage && (
              <p className="text-xs text-orange-600 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{validationMessage}</span>
              </p>
            )}

            {/* Error Message */}
            {hasError && errorMessage && (
              <p className="text-xs text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Price Change Indicator */}
          {getPriceChangeIndicator() && (
            <div className="flex justify-end">
              {getPriceChangeIndicator()}
            </div>
          )}

          {/* Category ID (for debugging - remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-slate-400 font-mono">
              ID: {category.id.slice(0, 8)}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
