'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigatorProps {
  weekStart: string;
  onPrev: () => void;
  onNext: () => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekNavigator({ weekStart, onPrev, onNext }: WeekNavigatorProps) {
  const d = new Date(weekStart + 'T12:00:00');
  const mon = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  const sun = new Date(d);
  sun.setDate(sun.getDate() + 6);
  const sunStr = sun.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <Button variant="outline" size="sm" onClick={onPrev}>
        <ChevronLeft className="w-4 h-4" />
        Prev
      </Button>
      <span className="text-sm font-medium text-slate-700">
        {mon} – {sunStr}
      </span>
      <Button variant="outline" size="sm" onClick={onNext}>
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
