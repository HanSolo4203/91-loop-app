'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import PayrollRunsTable from '@/components/staff/payroll-runs-table';
import PayrollRunDetail from '@/components/staff/payroll-run-detail';
import GenerateRunDialog from '@/components/staff/generate-run-dialog';
import { Banknote } from 'lucide-react';
import {
  usePayrollRuns,
  usePayrollRun,
  useCreatePayrollRun,
  useUpdatePayrollRun,
} from '@/lib/hooks/use-payroll';
import type { PayrollRun } from '@/types/database';

function PayrollContent() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: runsData, isLoading: runsLoading, refetch: refetchRuns } = usePayrollRuns();
  const { data: runData, isLoading: runLoading, refetch: refetchRun } = usePayrollRun(selectedRunId);

  const createMutation = useCreatePayrollRun();
  const updateMutation = useUpdatePayrollRun();

  const runs = runsData?.success && Array.isArray(runsData.data) ? runsData.data : [];
  const selectedRun = runData?.success && runData.data ? runData.data : null;

  const handleView = (run: PayrollRun) => {
    setSelectedRunId(run.id);
  };

  const handleBack = () => {
    setSelectedRunId(null);
  };

  const handleGenerate = async (payload: { period_start: string; period_end: string }) => {
    const created = await createMutation.mutateAsync(payload);
    setSelectedRunId(created.id);
    setGenerateOpen(false);
    refetchRuns();
  };

  const handleApprove = async () => {
    if (!selectedRunId) return;
    await updateMutation.mutateAsync({ id: selectedRunId, payload: { status: 'approved' } });
    refetchRun();
    refetchRuns();
  };

  const handleMarkPaid = async () => {
    if (!selectedRunId) return;
    await updateMutation.mutateAsync({ id: selectedRunId, payload: { status: 'paid' } });
    refetchRun();
    refetchRuns();
  };

  const handleUpdateDeductions = async (entryId: string, deductions: number) => {
    if (!selectedRunId || !selectedRun?.entries) return;

    const entry = selectedRun.entries.find((e) => e.id === entryId);
    if (!entry) return;

    const entries = [{ id: entryId, deductions, notes: entry.notes ?? undefined }];

    await updateMutation.mutateAsync({
      id: selectedRunId,
      payload: { entries },
    });
    refetchRun();
    refetchRuns();
  };

  const showDetail = !!selectedRunId && selectedRun;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-8">
          <Banknote className="w-4 h-4" />
          <span>/</span>
          <span className="text-slate-900 font-medium">Payroll</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Banknote className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            Staff – Payroll
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage bi-weekly payroll runs, approve, and mark as paid. Export to PDF.
          </p>
        </div>

        {showDetail ? (
          <PayrollRunDetail
            run={selectedRun}
            loading={runLoading}
            onBack={handleBack}
            onApprove={handleApprove}
            onMarkPaid={handleMarkPaid}
            onUpdateDeductions={handleUpdateDeductions}
          />
        ) : (
          <>
            <PayrollRunsTable
              runs={runs}
              loading={runsLoading}
              onGenerate={() => setGenerateOpen(true)}
              onView={handleView}
              onRefresh={refetchRuns}
            />
            <GenerateRunDialog
              open={generateOpen}
              onOpenChange={setGenerateOpen}
              onSubmit={handleGenerate}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <AuthGuard>
      <PayrollContent />
    </AuthGuard>
  );
}
