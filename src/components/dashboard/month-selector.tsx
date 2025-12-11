'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorValue {
  month: number | null;
  year: number;
}

interface MonthSelectorProps {
  value?: MonthSelectorValue;
  onChange: (month: number | null, year: number) => void;
  loading?: boolean;
}

const monthOptions = [
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
  { value: 11, label: 'December' },
  { value: 'all', label: 'All Months (Year Total)' }
] as const;

export default function MonthSelector({ value, onChange, loading = false }: MonthSelectorProps) {
  const now = new Date();
  const fallbackValue: MonthSelectorValue = {
    month: now.getMonth(),
    year: now.getFullYear(),
  };

  const initialValue = value ?? fallbackValue;

  const [currentMonth, setCurrentMonth] = useState<number | null>(initialValue.month);
  const [currentYear, setCurrentYear] = useState(initialValue.year);

  useEffect(() => {
    if (!value) {
      return;
    }
    setCurrentMonth(value.month);
    setCurrentYear(value.year);
  }, [value]);

  const handleMonthChange = (month: string) => {
    if (month === 'all') {
      setCurrentMonth(null);
      onChange(null, currentYear);
      return;
    }

    const newMonth = parseInt(month, 10);
    setCurrentMonth(newMonth);
    onChange(newMonth, currentYear);
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year, 10);
    setCurrentYear(newYear);
    onChange(currentMonth, newYear);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === null) {
      return;
    }
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
    if (currentMonth === null) {
      return;
    }
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

  const isCurrentMonth = currentMonth !== null && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
  const isAllMonths = currentMonth === null;

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
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousMonth}
        className="p-2"
        disabled={loading || isAllMonths}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={isAllMonths ? 'all' : currentMonth?.toString() ?? ''}
        onValueChange={handleMonthChange}
        disabled={loading}
      >
        <SelectTrigger className="w-40 bg-white border border-slate-300 shadow-sm focus:ring-blue-500">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-slate-200 shadow-lg">
          {monthOptions.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentYear.toString()} onValueChange={handleYearChange} disabled={loading}>
        <SelectTrigger className="w-24 bg-white border border-slate-300 shadow-sm focus:ring-blue-500">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-slate-200 shadow-lg">
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
        disabled={loading || isAllMonths}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && !isAllMonths && (
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
