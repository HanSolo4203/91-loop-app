'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Save, X, AlertCircle, Loader2 } from 'lucide-react';
import type { RFIDDataInsert } from '@/types/database';

interface ManualEntryFormProps {
  onSave: (data: RFIDDataInsert) => Promise<void>;
  isLoading?: boolean;
}

export default function ManualEntryForm({ onSave, isLoading = false }: ManualEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<RFIDDataInsert>({
    rfid_number: '',
    category: '',
    status: '',
    condition: null,
    location: null,
    user_name: null,
    qty_washed: 0,
    washes_remaining: 0,
    assigned_location: null,
    date_assigned: null,
    date_time: null,
  });

  const statusOptions = [
    'Issued to Customer',
    'Received Into Laundry',
    'External Laundry',
    'Verified',
    'In Storage',
    'Procured',
    'Damaged',
    'To be Stitched/Fix',
    'Lost/Stolen',
    'Disposed',
  ];

  const conditionOptions = ['Good', 'Average', 'Bad', 'Teared', 'Stained'];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rfid_number.trim()) {
      newErrors.rfid_number = 'RFID Number is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      // Reset form and close dialog on success
      setFormData({
        rfid_number: '',
        category: '',
        status: '',
        condition: null,
        location: null,
        user_name: null,
        qty_washed: 0,
        washes_remaining: 0,
        assigned_location: null,
        date_assigned: null,
        date_time: null,
      });
      setErrors({});
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving RFID data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      rfid_number: '',
      category: '',
      status: '',
      condition: null,
      location: null,
      user_name: null,
      qty_washed: 0,
      washes_remaining: 0,
      assigned_location: null,
      date_assigned: null,
      date_time: null,
    });
    setErrors({});
    setIsOpen(false);
  };

  const handleDateChange = (field: 'date_assigned' | 'date_time', value: string) => {
    if (value) {
      try {
        const date = new Date(value);
        setFormData({ ...formData, [field]: date.toISOString() });
      } catch {
        setFormData({ ...formData, [field]: null });
      }
    } else {
      setFormData({ ...formData, [field]: null });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add RFID Record</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add RFID Record</DialogTitle>
          <DialogDescription>
            Manually enter RFID tracking data for a single item
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfid_number">
                RFID Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rfid_number"
                value={formData.rfid_number}
                onChange={(e) => setFormData({ ...formData, rfid_number: e.target.value })}
                placeholder="B0002493"
                className={errors.rfid_number ? 'border-red-500' : ''}
              />
              {errors.rfid_number && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.rfid_number}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Fitted Sheet - Single"
                className={errors.category ? 'border-red-500' : ''}
              />
              {errors.category && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.category}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.status}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, condition: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {conditionOptions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value || null })
                }
                placeholder="Main Laundry"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_name">User</Label>
              <Input
                id="user_name"
                value={formData.user_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, user_name: e.target.value || null })
                }
                placeholder="Dylan Hayward"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty_washed">QTY Washed</Label>
              <Input
                id="qty_washed"
                type="number"
                min="0"
                value={formData.qty_washed}
                onChange={(e) =>
                  setFormData({ ...formData, qty_washed: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="washes_remaining">Washes Remaining</Label>
              <Input
                id="washes_remaining"
                type="number"
                min="0"
                value={formData.washes_remaining}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    washes_remaining: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_location">Assigned Location</Label>
              <Input
                id="assigned_location"
                value={formData.assigned_location || ''}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_location: e.target.value || null })
                }
                placeholder="Main Laundry"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_assigned">Date Assigned</Label>
              <Input
                id="date_assigned"
                type="datetime-local"
                value={
                  formData.date_assigned
                    ? new Date(formData.date_assigned).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => handleDateChange('date_assigned', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="date_time">Date/Time</Label>
              <Input
                id="date_time"
                type="datetime-local"
                value={
                  formData.date_time
                    ? new Date(formData.date_time).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => handleDateChange('date_time', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Record
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

