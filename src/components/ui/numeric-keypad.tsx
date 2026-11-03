'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Delete, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  onClear?: () => void;
  maxLength?: number;
  className?: string;
  /** Show a decimal key and keep at most `decimalPlaces` digits after the point. */
  allowDecimal?: boolean;
  decimalPlaces?: number;
  /** Merged onto every key so kiosk screens can enlarge the targets. */
  buttonClassName?: string;
  displayClassName?: string;
  placeholder?: string;
}

function appendKey(
  current: string,
  key: string,
  maxLength: number,
  allowDecimal: boolean,
  decimalPlaces: number
): string {
  if (key === '.') {
    if (!allowDecimal || current.includes('.')) return current;
    const next = `${current === '' ? '0' : current}.`;
    return next.length <= maxLength ? next : current;
  }
  if (!/^\d$/.test(key)) return current;
  if (allowDecimal && current.includes('.')) {
    const fraction = current.split('.')[1] ?? '';
    if (fraction.length >= decimalPlaces) return current;
  }
  // "05" is a poor scale reading; replace a lone zero when decimals are on.
  if (allowDecimal && current === '0') return key;
  if (current.length >= maxLength) return current;
  return current + key;
}

export default function NumericKeypad({
  value,
  onChange,
  onConfirm,
  onClear,
  maxLength = 6,
  className = '',
  allowDecimal = false,
  decimalPlaces = 1,
  buttonClassName = '',
  displayClassName = '',
  placeholder = '0',
}: NumericKeypadProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleNumberClick = (num: string) => {
    const next = appendKey(inputValue, num, maxLength, allowDecimal, decimalPlaces);
    if (next === inputValue) return;
    setInputValue(next);
    onChange(next);
  };

  const handleBackspace = () => {
    const newValue = inputValue.slice(0, -1);
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    onClear?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  const keypadButtons = allowDecimal
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const digitClass = cn(
    'h-12 text-lg font-semibold text-slate-900 hover:bg-blue-50 hover:border-blue-300 hover:text-slate-900 transition-colors touch-manipulation',
    buttonClassName
  );
  const actionClass = cn(
    'h-12 text-sm font-medium text-slate-900 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors touch-manipulation',
    buttonClassName
  );

  return (
    <Card className={`p-4 bg-white text-slate-900 shadow-lg border ${className}`}>
      <div className="space-y-3">
        {/* Display */}
        <div className="text-center">
          <div
            className={cn(
              'text-2xl font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 min-h-[3rem] flex items-center justify-center',
              displayClassName
            )}
          >
            {inputValue || placeholder}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {keypadButtons.map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="lg"
              className={digitClass}
              onClick={() => handleNumberClick(key)}
              aria-label={key === '.' ? 'Decimal point' : undefined}
            >
              {key}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={actionClass}
            onClick={handleBackspace}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={actionClass}
            onClick={handleClear}
          >
            <Delete className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Confirm Button */}
        {onConfirm && (
          <Button
            type="button"
            size="lg"
            className={cn(
              'w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700',
              buttonClassName
            )}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        )}
      </div>
    </Card>
  );
}
