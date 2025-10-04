'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import type { LinenCategoryFormData } from '@/types/database';

interface AddLinenCategoryFormProps {
  onAdd: (categoryData: LinenCategoryFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AddLinenCategoryForm({
  onAdd,
  onCancel,
  isSubmitting = false,
}: AddLinenCategoryFormProps) {
  const [formData, setFormData] = useState<LinenCategoryFormData>({
    name: '',
    price_per_item: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  const validateForm = (data: LinenCategoryFormData): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!data.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
      newErrors.name = 'Category name must be less than 100 characters';
    }

    // Validate price
    if (data.price_per_item < 0) {
      newErrors.price_per_item = 'Price cannot be negative';
    } else if (data.price_per_item > 10000) {
      newErrors.price_per_item = 'Price cannot exceed R10,000';
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (field: keyof LinenCategoryFormData, value: string | number | boolean) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    validateForm(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }

    try {
      await onAdd(formData);
      // Reset form after successful submission
      setFormData({
        name: '',
        price_per_item: 0,
        is_active: true,
      });
      setErrors({});
      setIsValid(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <Plus className="w-5 h-5" />
          <span>Add New Linen Category</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="categoryName" className="text-sm font-medium text-slate-700">
                Category Name *
              </Label>
              <div className="relative">
                <Input
                  id="categoryName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., BATH TOWELS"
                  className={`${
                    errors.name 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } transition-colors`}
                  disabled={isSubmitting}
                  maxLength={100}
                />
                {errors.name && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                )}
                {!errors.name && formData.name && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Price Per Item */}
            <div className="space-y-2">
              <Label htmlFor="pricePerItem" className="text-sm font-medium text-slate-700">
                Price Per Item (R) *
              </Label>
              <div className="relative">
                <Input
                  id="pricePerItem"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10000"
                  value={formData.price_per_item}
                  onChange={(e) => handleInputChange('price_per_item', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`${
                    errors.price_per_item 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } transition-colors`}
                  disabled={isSubmitting}
                />
                {errors.price_per_item && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                )}
                {!errors.price_per_item && formData.price_per_item >= 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              {errors.price_per_item && (
                <p className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.price_per_item}</span>
                </p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <Label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active (category will be available for use)
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-blue-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Adding...' : 'Add Category'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
