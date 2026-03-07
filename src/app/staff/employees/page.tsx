'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import EmployeesTable from '@/components/staff/employees-table';
import EmployeeFormDrawer, { type EmployeeFormData } from '@/components/staff/employee-form-drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/lib/hooks/use-employees';
import type { Employee } from '@/types/database';

function EmployeesContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const employees = data?.success && Array.isArray(data.data) ? data.data : [];

  const handleAdd = () => {
    setSelectedEmployee(null);
    setDrawerOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDrawerOpen(true);
  };

  const handleDelete = (emp: Employee) => {
    setDeleteTarget(emp);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (form: EmployeeFormData) => {
    if (selectedEmployee) {
      await updateMutation.mutateAsync({
        id: selectedEmployee.id,
        payload: form,
      });
    } else {
      await createMutation.mutateAsync(form);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-8">
          <Users className="w-4 h-4" />
          <span>/</span>
          <span className="text-slate-900 font-medium">Employees</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            Staff – Employees
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage employee details and payroll information
          </p>
        </div>

        <EmployeesTable
          employees={employees}
          loading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={() => refetch()}
        />

        <EmployeeFormDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          employee={selectedEmployee}
          onSave={handleSave}
        />

        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete employee</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {deleteTarget?.full_name}? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <AuthGuard>
      <EmployeesContent />
    </AuthGuard>
  );
}
