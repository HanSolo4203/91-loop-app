'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ui/image-upload';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { Client } from '@/types/database';

interface ClientFormProps {
  client?: Client | null;
  onSave: (clientData: ClientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ClientFormData {
  name: string;
  contact_number?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  logo_url?: string;
}

export default function ClientForm({ client, onSave, onCancel, isLoading = false }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    contact_number: '',
    email: '',
    address: '',
    is_active: true,
    logo_url: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when client prop changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        contact_number: client.contact_number || '',
        email: client.email || '',
        address: client.address || '',
        is_active: client.is_active ?? true,
        logo_url: client.logo_url || ''
      });
    } else {
      setFormData({
        name: '',
        contact_number: '',
        email: '',
        address: '',
        is_active: true,
        logo_url: ''
      });
    }
    setErrors({});
  }, [client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Client name must be 255 characters or less';
    }

    // Validate contact number
    if (formData.contact_number && formData.contact_number.length > 50) {
      newErrors.contact_number = 'Contact number must be 50 characters or less';
    }
    if (formData.contact_number) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = formData.contact_number.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.contact_number = 'Invalid contact number format';
      }
    }

    // Validate email
    if (formData.email) {
      if (formData.email.length > 255) {
        newErrors.email = 'Email must be 255 characters or less';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    // Validate address
    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address must be 500 characters or less';
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
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ClientFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const isEditing = !!client;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600" />
          <span>{isEditing ? 'Edit Client' : 'Add New Client'}</span>
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update client information and contact details.' 
            : 'Add a new client to the system with their contact information.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-700">
              Client Name *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter client name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-300' : ''}
              disabled={isSubmitting || isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <ImageUpload
              label="Client Logo"
              value={formData.logo_url}
              onChange={(url) => handleInputChange('logo_url', url || '')}
              onError={(error) => setErrors(prev => ({ ...prev, logo_url: error }))}
              disabled={isSubmitting || isLoading}
              maxSizeMB={2}
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg']}
              previewSize="md"
              showPreview={true}
            />
            {errors.logo_url && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.logo_url}</span>
              </p>
            )}
          </div>

          {/* Contact Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contact_number" className="text-sm font-medium text-slate-700">
                Contact Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="contact_number"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.contact_number}
                  onChange={(e) => handleInputChange('contact_number', e.target.value)}
                  className={`pl-10 ${errors.contact_number ? 'border-red-300' : ''}`}
                  disabled={isSubmitting || isLoading}
                />
              </div>
              {errors.contact_number && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.contact_number}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-red-300' : ''}`}
                  disabled={isSubmitting || isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-slate-700">
              Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea
                id="address"
                placeholder="Enter client address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`pl-10 min-h-[80px] resize-none ${errors.address ? 'border-red-300' : ''}`}
                disabled={isSubmitting || isLoading}
              />
            </div>
            {errors.address && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.address}</span>
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Status
            </Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={isSubmitting || isLoading}
              />
              <Label htmlFor="is_active" className="text-sm text-slate-700 cursor-pointer">
                Active client
              </Label>
            </div>
            <p className="text-xs text-slate-500">
              Inactive clients won&apos;t appear in client selection lists for new batches.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex items-center space-x-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Update Client' : 'Create Client'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
