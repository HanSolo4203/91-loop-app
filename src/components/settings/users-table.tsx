'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Edit, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface UsersTableProps {
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  refreshTrigger?: number;
}

export default function UsersTable({ onAddUser, onEditUser, refreshTrigger }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user and session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user.id);
        }

        // Fetch users with Authorization header
        const response = await fetch('/api/users', {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
          credentials: 'include',
        });
        const result = await response.json();

        if (result.success) {
          setUsers(result.data || []);
        } else {
          setError(result.error || 'Failed to load users');
        }
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage users and their access to the application
              </CardDescription>
            </div>
            <Button onClick={onAddUser} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No users found. Click "Add User" to create a new user.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Full Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{user.email || 'N/A'}</td>
                      <td className="py-3 px-4">{user.full_name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {user.id === currentUser && (
                            <span className="text-xs text-slate-500">(You)</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditUser(user)}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

