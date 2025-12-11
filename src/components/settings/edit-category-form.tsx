'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Save, X } from 'lucide-react';
import type { LinenCategory } from '@/types/database';

interface EditCategoryFormProps {
  category: LinenCategory;
  onSave: (id: string, data: { name?: string; price_per_item?: number; is_active?: boolean; section?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function EditCategoryForm({
  category,
  onSave,
  onCancel,
  isSubmitting = false,
}: EditCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category.name,
    price_per_item: category.price_per_item,
    is_active: category.is_active,
    section: category.section || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setFormData({
      name: category.name,
      price_per_item: category.price_per_item,
      is_active: category.is_active,
      section: category.section || '',
    });
  }, [category]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Category name must be less than 100 characters';
    }

    // Validate price
    if (formData.price_per_item < 0) {
      newErrors.price_per_item = 'Price cannot be negative';
    } else if (formData.price_per_item > 10000) {
      newErrors.price_per_item = 'Price cannot exceed R10,000';
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    // Validate on change
    setTimeout(() => validateForm(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(category.id, {
        name: formData.name.trim() !== category.name ? formData.name.trim() : undefined,
        price_per_item: formData.price_per_item !== category.price_per_item ? formData.price_per_item : undefined,
        is_active: formData.is_active !== category.is_active ? formData.is_active : undefined,
        section: formData.section !== (category.section || '') ? (formData.section || undefined) : undefined,
      });
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const hasChanges = 
    formData.name.trim() !== category.name ||
    formData.price_per_item !== category.price_per_item ||
    formData.is_active !== category.is_active ||
    formData.section !== (category.section || '');

  return (
    <Card className="mb-4 border-purple-200 bg-purple-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-purple-900">
          <Save className="w-5 h-5" />
          <span>Edit Category: {category.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="editCategoryName" className="text-sm font-medium text-slate-700">
                Category Name *
              </Label>
              <div className="relative">
                <Input
                  id="editCategoryName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., BATH TOWELS"
                  className={`${
                    errors.name 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 focus:border-purple-500 focus:ring-purple-500'
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

            {/* Section */}
            <div className="space-y-2">
              <Label htmlFor="editCategorySection" className="text-sm font-medium text-slate-700">
                Section
              </Label>
              <select
                id="editCategorySection"
                value={formData.section || ''}
                onChange={(e) => handleInputChange('section', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                disabled={isSubmitting}
              >
                <option value="">Auto-detect (based on name)</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Front of House">Front of House</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Price Per Item */}
            <div className="space-y-2">
              <Label htmlFor="editPricePerItem" className="text-sm font-medium text-slate-700">
                Price Per Item (R) *
              </Label>
              <div className="relative">
                <Input
                  id="editPricePerItem"
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
                      : 'border-slate-300 focus:border-purple-500 focus:ring-purple-500'
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
              id="editIsActive"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              disabled={isSubmitting}
            />
            <Label htmlFor="editIsActive" className="text-sm font-medium text-slate-700">
              Active (category will be available for use)
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-purple-200">
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
              disabled={!isValid || !hasChanges || isSubmitting}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

