'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Employee } from '@/types/database';

interface AbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  shiftType: 'day' | 'night';
  employeeId: string;
  employeeName: string;
  employees: Employee[];
  onSubmit: (payload: {
    employee_id: string;
    absence_date: string;
    shift_type: 'day' | 'night';
    cover_employee_id: string | null;
    reason: string | null;
  }) => Promise<void>;
}

export default function AbsenceDialog({
  open,
  onOpenChange,
  date,
  shiftType,
  employeeId,
  employeeName,
  employees,
  onSubmit,
}: AbsenceDialogProps) {
  const [coverId, setCoverId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCoverId(null);
      setReason('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        employee_id: employeeId,
        absence_date: date,
        shift_type: shiftType,
        cover_employee_id: coverId || null,
        reason: reason.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const shiftLabel = shiftType === 'day' ? 'Day' : 'Night';
  const eligibleCovers = employees.filter(
    (e) => e.id !== employeeId && e.status === 'active' && (e.shift_type === shiftType || e.shift_type === 'both')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Absent</DialogTitle>
          <DialogDescription>
            {employeeName} – {date} ({shiftLabel})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cover Person</Label>
            <Select
              value={coverId ?? '__none__'}
              onValueChange={(v) => setCoverId(v === '__none__' ? null : v)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cover (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {eligibleCovers.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sick leave, Annual leave"
              rows={3}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
