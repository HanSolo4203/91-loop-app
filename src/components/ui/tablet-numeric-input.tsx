'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import NumericKeypad from '@/components/ui/numeric-keypad';
import { Calculator } from 'lucide-react';

interface TabletNumericInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export default function TabletNumericInput({
  value,
  onChange,
  placeholder = 'Enter quantity',
  maxLength = 6,
  className = '',
  disabled = false,
  id,
  name
}: TabletNumericInputProps) {
  const [showKeypad, setShowKeypad] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keypadRef = useRef<HTMLDivElement>(null);

  // Detect tablet screen size
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Consider it a tablet if width is between 768px and 1024px, or if it's a touch device
      const isTabletSize = width >= 768 && width <= 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTablet(isTabletSize || (isTouchDevice && width >= 768));
    };

    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  // Handle click outside to close keypad
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        keypadRef.current &&
        !keypadRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowKeypad(false);
      }
    };

    if (showKeypad) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showKeypad]);

  const handleInputClick = () => {
    if (isTablet && !disabled) {
      setShowKeypad(true);
      inputRef.current?.blur();
    }
  };

  const handleKeypadChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleKeypadConfirm = () => {
    setShowKeypad(false);
    inputRef.current?.focus();
  };

  const handleKeypadClear = () => {
    setShowKeypad(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          onClick={handleInputClick}
          className={`${className} ${isTablet ? 'cursor-pointer' : ''}`}
          disabled={disabled}
          maxLength={maxLength}
        />
        {isTablet && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Calculator className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>

      {/* Keypad for Tablet */}
      {isTablet && showKeypad && (
        <div
          ref={keypadRef}
          className="absolute left-0 top-full mt-2 z-50 w-64"
        >
          <NumericKeypad
            value={value}
            onChange={handleKeypadChange}
            onConfirm={handleKeypadConfirm}
            onClear={handleKeypadClear}
            maxLength={maxLength}
          />
        </div>
      )}
    </div>
  );
}
