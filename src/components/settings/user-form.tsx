'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import type { User } from './users-table';

export interface UserFormData {
  email: string;
  password?: string;
  full_name: string;
  role: 'admin' | 'user';
  kiosk_pin?: string;
}

interface UserFormProps {
  user?: User | null;
  onSave: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || 'user',
    kiosk_pin: '',
  });
  const [clearKioskPin, setClearKioskPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!user && !formData.password) {
      setError('Password is required for new users');
      setLoading(false);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const pin = (formData.kiosk_pin || '').trim();
    if (formData.role === 'admin' && pin && !/^\d{4}$/.test(pin)) {
      setError('Kiosk PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    try {
      const payload: UserFormData = {
        ...formData,
      };
      if (formData.role === 'admin') {
        // On edit, omit unchanged PIN (leave blank to keep). Empty + clear flag handled below.
        if (pin) {
          payload.kiosk_pin = pin;
        } else if (!user) {
          delete payload.kiosk_pin;
        } else if (clearKioskPin) {
          payload.kiosk_pin = '';
        } else {
          delete payload.kiosk_pin;
        }
      } else {
        payload.kiosk_pin = '';
      }
      await onSave(payload);
      setSuccess(user ? 'User updated successfully!' : 'User created successfully!');
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user ? 'Edit User' : 'Add New User'}</CardTitle>
        <CardDescription>
          {user ? 'Update user information and permissions' : 'Create a new user account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {user ? '(leave blank to keep current)' : '*'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              disabled={loading}
              placeholder={user ? 'Enter new password (optional)' : 'Minimum 6 characters'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={loading}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'admin' | 'user',
                  kiosk_pin: e.target.value === 'admin' ? formData.kiosk_pin : '',
                })
              }
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="kiosk_pin">
                Kiosk PIN {user?.kiosk_pin ? '(leave blank to keep current)' : ''}
              </Label>
              <Input
                id="kiosk_pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={formData.kiosk_pin || ''}
                onChange={(e) => {
                  setClearKioskPin(false);
                  setFormData({
                    ...formData,
                    kiosk_pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                  });
                }}
                disabled={loading || clearKioskPin}
                placeholder="4-digit PIN"
              />
              <p className="text-xs text-slate-500">
                Used to enable and exit clocking kiosk mode on a device.
                {user?.kiosk_pin ? ' A PIN is currently set.' : ''}
              </p>
              {user?.kiosk_pin && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={clearKioskPin}
                    onChange={(e) => {
                      setClearKioskPin(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, kiosk_pin: '' });
                      }
                    }}
                    disabled={loading}
                  />
                  Remove kiosk PIN
                </label>
              )}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{user ? 'Update User' : 'Create User'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

