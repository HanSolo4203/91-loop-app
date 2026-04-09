'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Download, Loader2 } from 'lucide-react';
import { pdfGenerator } from '@/lib/services/pdf-generator';
import type { PayrollRunWithEntries } from '@/types/database';

interface PayrollRunDetailProps {
  run: PayrollRunWithEntries;
  loading: boolean;
  onBack: () => void;
  onApprove: () => Promise<void>;
  onMarkPaid: () => Promise<void>;
  onUpdateDeductions: (entryId: string, deductions: number) => Promise<void>;
}

export default function PayrollRunDetail({
  run,
  loading,
  onBack,
  onApprove,
  onMarkPaid,
  onUpdateDeductions,
}: PayrollRunDetailProps) {
  const [localDeductions, setLocalDeductions] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, number> = {};
    (run.entries || []).forEach((e) => {
      map[e.id] = e.deductions ?? 0;
    });
    setLocalDeductions(map);
  }, [run.entries]);

  const handleDeductionChange = async (entryId: string, value: number) => {
    setLocalDeductions((prev) => ({ ...prev, [entryId]: value }));
    setSaving(entryId);
    try {
      await onUpdateDeductions(entryId, value);
    } finally {
      setSaving(null);
    }
  };

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

  const sortedEntries = [...(run.entries || [])].sort(
    (a, b) => a.employee_id.localeCompare(b.employee_id) || a.id.localeCompare(b.id)
  );
  const entryPaymentNumber = new Map<string, number>();
  let currentEmp = '';
  let num = 0;
  for (const e of sortedEntries) {
    if (e.employee_id !== currentEmp) {
      currentEmp = e.employee_id;
      num = 0;
    }
    num += 1;
    entryPaymentNumber.set(e.id, num);
  }

  const handleExportPDF = async () => {
    await pdfGenerator.generatePayrollPDF({
      periodStart: run.period_start,
      periodEnd: run.period_end,
      status: run.status,
      date: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
      items: sortedEntries.map((e) => ({
        employeeName: `${e.employee?.full_name ?? 'Unknown'} (Payment ${entryPaymentNumber.get(e.id) ?? 1})`,
        biWeeklySalary: e.bi_weekly_salary ?? 0,
        deductions: e.deductions ?? 0,
        netPay: e.net_pay ?? 0,
        notes: e.notes ?? undefined,
      })),
      totalAmount: run.total_amount ?? 0,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>
                {run.period_start} – {run.period_end}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {statusBadge(run.status)}
                <span>Total: {formatCurrency(run.total_amount ?? 0)}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              {run.status === 'draft' && (
                <Button size="sm" onClick={onApprove}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              )}
              {run.status === 'approved' && (
                <Button size="sm" onClick={onMarkPaid}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark Paid
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => {
                const salary = entry.bi_weekly_salary ?? 0;
                const deductions = localDeductions[entry.id] ?? entry.deductions ?? 0;
                const netPay = Math.max(0, salary - deductions);
                const paymentNum = entryPaymentNumber.get(entry.id) ?? 1;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.employee?.full_name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>Payment {paymentNum}</TableCell>
                    <TableCell>{formatCurrency(salary)}</TableCell>
                    <TableCell>
                      {run.status === 'draft' ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={deductions}
                          onChange={(e) =>
                            handleDeductionChange(
                              entry.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!!saving}
                          className="w-24"
                        />
                      ) : (
                        formatCurrency(deductions)
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(netPay)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
