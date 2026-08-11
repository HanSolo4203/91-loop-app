'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import EmployeesTable from '@/components/staff/employees-table';
import EmployeeFormDrawer, { type EmployeeFormData } from '@/components/staff/employee-form-drawer';
import SalarySchedule from '@/components/staff/salary-schedule';
import ClockRecords from '@/components/staff/clock-records';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Clock } from 'lucide-react';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/lib/hooks/use-employees';
import type { Employee } from '@/types/database';

const VALID_TABS = ['employees', 'salary', 'clock-records'] as const;
type TabValue = (typeof VALID_TABS)[number];

function EmployeesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const initialTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : 'employees';

  const [tab, setTab] = useState<TabValue>(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const employees = data?.success && Array.isArray(data.data) ? data.data : [];

  useEffect(() => {
    if (!selectedEmployee) return;
    const refreshed = employees.find((e) => e.id === selectedEmployee.id);
    if (refreshed && refreshed !== selectedEmployee) {
      setSelectedEmployee(refreshed);
    }
  }, [employees, selectedEmployee]);

  useEffect(() => {
    if (
      tabParam &&
      VALID_TABS.includes(tabParam as TabValue) &&
      tabParam !== tab
    ) {
      setTab(tabParam as TabValue);
    }
  }, [tabParam, tab]);

  const handleTabChange = (value: string) => {
    const next = value as TabValue;
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'employees') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    const qs = params.toString();
    router.replace(qs ? `/staff/employees?${qs}` : '/staff/employees', { scroll: false });
  };

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

  const handlePinUpdated = () => {
    void refetch();
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
            Manage employee details, payroll, and clock records
          </p>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="employees" className="data-[state=active]:bg-slate-100">
              Employees
            </TabsTrigger>
            <TabsTrigger value="salary" className="data-[state=active]:bg-slate-100">
              <Calendar className="w-4 h-4 mr-1.5" />
              Salary Schedule
            </TabsTrigger>
            <TabsTrigger value="clock-records" className="data-[state=active]:bg-slate-100">
              <Clock className="w-4 h-4 mr-1.5" />
              Clock Records
            </TabsTrigger>
          </TabsList>
          <TabsContent value="employees" className="mt-4">
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
          </TabsContent>
          <TabsContent value="salary" className="mt-4">
            <SalarySchedule />
          </TabsContent>
          <TabsContent value="clock-records" className="mt-4">
            <ClockRecords />
          </TabsContent>
        </Tabs>

        <EmployeeFormDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          employee={selectedEmployee}
          onSave={handleSave}
          onPinUpdated={handlePinUpdated}
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

function EmployeesPageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
      Loading…
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<EmployeesPageFallback />}>
        <EmployeesContent />
      </Suspense>
    </AuthGuard>
  );
}
