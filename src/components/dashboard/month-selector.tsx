'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  value: { month: number; year: number };
  onChange: (month: number, year: number) => void;
  loading?: boolean;
}

const months = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
];

export default function MonthSelector({ value, onChange, loading = false }: MonthSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(value.month);
  const [currentYear, setCurrentYear] = useState(value.year);

  useEffect(() => {
    setCurrentMonth(value.month);
    setCurrentYear(value.year);
  }, [value]);

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month);
    setCurrentMonth(newMonth);
    onChange(newMonth, currentYear);
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setCurrentYear(newYear);
    onChange(currentMonth, newYear);
  };

  const goToPreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear = currentYear - 1;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onChange(newMonth, newYear);
  };

  const goToNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear = currentYear + 1;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onChange(newMonth, newYear);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    onChange(now.getMonth(), now.getFullYear());
  };

  // Generate year options (current year ± 5 years)
  const currentYearOption = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYearOption - 5 + i);

  const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-10 w-10 bg-slate-200 rounded"></div>
        <div className="h-10 w-32 bg-slate-200 rounded"></div>
        <div className="h-10 w-20 bg-slate-200 rounded"></div>
        <div className="h-10 w-10 bg-slate-200 rounded"></div>
        <div className="h-10 w-24 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousMonth}
        className="p-2"
        disabled={loading}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={currentMonth.toString()} onValueChange={handleMonthChange} disabled={loading}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentYear.toString()} onValueChange={handleYearChange} disabled={loading}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNextMonth}
        className="p-2"
        disabled={loading}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToCurrentMonth}
          className="flex items-center space-x-1"
          disabled={loading}
        >
          <Calendar className="h-4 w-4" />
          <span>Today</span>
        </Button>
      )}
    </div>
  );
}
