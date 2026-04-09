'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton, LoadingTable } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Plus, Edit, Trash2, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import type { Employee } from '@/types/database';

interface EmployeesTableProps {
  employees: Employee[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  onRefresh: () => void;
}

export default function EmployeesTable({
  employees,
  loading,
  searchTerm,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: EmployeesTableProps) {
  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.phone && e.phone.includes(searchTerm)) ||
      (e.role && e.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

  const shiftLabel = (s: string) => (s === 'both' ? 'Both' : s.charAt(0).toUpperCase() + s.slice(1));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <LoadingSkeleton width="w-48" height="h-6" />
              <LoadingSkeleton width="w-64" height="h-4" />
            </div>
            <LoadingSkeleton width="w-32" height="h-10" />
          </div>
        </CardHeader>
        <CardContent>
          <LoadingTable rows={5} columns={7} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Employees
            </CardTitle>
            <CardDescription>
              {filtered.length} employee{filtered.length !== 1 ? 's' : ''} found
              {searchTerm && ` matching "${searchTerm}"`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-full h-full" />}
            title="No employees yet"
            description={searchTerm ? `No employees match "${searchTerm}".` : 'Add your first employee to get started.'}
            action={
              searchTerm
                ? { label: 'Clear Search', onClick: () => onSearchChange('') }
                : { label: 'Add Employee', onClick: onAdd }
            }
            className="py-8"
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell className="text-sm">{emp.phone || '-'}</TableCell>
                    <TableCell className="text-sm">{emp.email || '-'}</TableCell>
                    <TableCell className="text-sm">{emp.role || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{shiftLabel(emp.shift_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(
                        emp.monthly_salary ?? (emp.bi_weekly_salary != null ? emp.bi_weekly_salary * 2 : 0)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          emp.status === 'active'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }
                      >
                        {emp.status === 'active' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(emp)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(emp)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
