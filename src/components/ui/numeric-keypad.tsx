'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Delete, ArrowLeft } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  onClear?: () => void;
  maxLength?: number;
  className?: string;
}

export default function NumericKeypad({
  value,
  onChange,
  onConfirm,
  onClear,
  maxLength = 6,
  className = ''
}: NumericKeypadProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleNumberClick = (num: string) => {
    const newValue = inputValue + num;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      onChange(newValue);
    }
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

  const keypadButtons = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '0', label: '0' },
  ];

  return (
    <Card className={`p-4 bg-white shadow-lg border ${className}`}>
      <div className="space-y-3">
        {/* Display */}
        <div className="text-center">
          <div className="text-2xl font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 min-h-[3rem] flex items-center justify-center">
            {inputValue || '0'}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {keypadButtons.map((button) => (
            <Button
              key={button.value}
              variant="outline"
              size="lg"
              className="h-12 text-lg font-semibold hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => handleNumberClick(button.value)}
            >
              {button.label}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-12 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
            onClick={handleBackspace}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
            onClick={handleClear}
          >
            <Delete className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Confirm Button */}
        {onConfirm && (
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        )}
      </div>
    </Card>
  );
}
