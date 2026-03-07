'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, Banknote, Eye, CheckCircle } from 'lucide-react';
import type { PayrollRun } from '@/types/database';

interface PayrollRunsTableProps {
  runs: PayrollRun[];
  loading: boolean;
  onGenerate: () => void;
  onView: (run: PayrollRun) => void;
  onRefresh: () => void;
}

export default function PayrollRunsTable({
  runs,
  loading,
  onGenerate,
  onView,
  onRefresh,
}: PayrollRunsTableProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 border-slate-200',
      approved: 'bg-amber-100 text-amber-800 border-amber-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
    };
    return (
      <Badge className={variants[status] || 'bg-slate-100 text-slate-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

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
          <LoadingTable rows={5} columns={4} />
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
              <Banknote className="w-5 h-5 text-blue-600" />
              Payroll Runs
            </CardTitle>
            <CardDescription>
              {runs.length} run{runs.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button onClick={onGenerate}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <EmptyState
            icon={<Banknote className="w-full h-full" />}
            title="No payroll runs yet"
            description="Generate a payroll run for a bi-weekly period to get started."
            action={{ label: 'Generate Run', onClick: onGenerate }}
            className="py-8"
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} className="hover:bg-slate-50">
                    <TableCell>
                      {run.period_start} – {run.period_end}
                    </TableCell>
                    <TableCell>{statusBadge(run.status)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(run.total_amount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => onView(run)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
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
