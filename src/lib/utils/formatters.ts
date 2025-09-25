import type { BatchStatus } from '@/types/database';

// Custom error class for formatter errors
export class FormatterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'FormatterError';
  }
}

// Formatter configuration
export interface CurrencyConfig {
  currency: string;
  locale: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
}

export interface DateConfig {
  locale: string;
  timeZone: string;
}

// Default configurations
const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  currency: 'ZAR', // South African Rand
  locale: 'en-ZA',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

const DEFAULT_DATE_CONFIG: DateConfig = {
  locale: 'en-ZA',
  timeZone: 'Africa/Johannesburg'
};

/**
 * Format currency amount in South African Rand
 * @param amount - Amount to format
 * @param config - Currency configuration options
 * @returns string - Formatted currency string
 */
export function formatCurrency(
  amount: number,
  config: Partial<CurrencyConfig> = {}
): string {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new FormatterError(
        'Amount must be a valid number',
        'INVALID_AMOUNT',
        400
      );
    }

    const currencyConfig = { ...DEFAULT_CURRENCY_CONFIG, ...config };

    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.currency,
      minimumFractionDigits: currencyConfig.minimumFractionDigits,
      maximumFractionDigits: currencyConfig.maximumFractionDigits
    }).format(amount);
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format currency',
      'CURRENCY_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format a number as currency - SSR-safe version
 * @param amount - The amount to format
 * @returns string - Formatted currency string (R format)
 */
export function formatCurrencySSR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'R 0.00';
  }
  
  // Use consistent formatting that works the same on server and client
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

/**
 * Format currency amount with custom symbol
 * @param amount - Amount to format
 * @param symbol - Currency symbol (default: 'R')
 * @param showDecimals - Whether to show decimal places
 * @returns string - Formatted currency string
 */
export function formatCurrencyWithSymbol(
  amount: number,
  symbol: string = 'R',
  showDecimals: boolean = true
): string {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new FormatterError(
        'Amount must be a valid number',
        'INVALID_AMOUNT',
        400
      );
    }

    const formattedNumber = showDecimals 
      ? amount.toFixed(2)
      : Math.round(amount).toString();

    return `${symbol}${formattedNumber}`;
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format currency with symbol',
      'CURRENCY_SYMBOL_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format date in various formats
 * @param date - Date to format (Date object or ISO string)
 * @param format - Format type
 * @param config - Date configuration options
 * @returns string - Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' | 'full' | 'iso' | 'time' | 'datetime' = 'medium',
  config: Partial<DateConfig> = {}
): string {
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new FormatterError(
          'Invalid date string',
          'INVALID_DATE_STRING',
          400
        );
      }
    } else if (date instanceof Date) {
      dateObj = date;
      if (isNaN(dateObj.getTime())) {
        throw new FormatterError(
          'Invalid date object',
          'INVALID_DATE_OBJECT',
          400
        );
      }
    } else {
      throw new FormatterError(
        'Date must be a Date object or ISO string',
        'INVALID_DATE_TYPE',
        400
      );
    }

    const dateConfig = { ...DEFAULT_DATE_CONFIG, ...config };

    switch (format) {
      case 'short':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          dateStyle: 'short',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      case 'medium':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          dateStyle: 'medium',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      case 'long':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          dateStyle: 'long',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      case 'full':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          dateStyle: 'full',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      case 'iso':
        return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

      case 'time':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          timeStyle: 'short',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      case 'datetime':
        return new Intl.DateTimeFormat(dateConfig.locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: dateConfig.timeZone
        }).format(dateObj);

      default:
        throw new FormatterError(
          `Unsupported date format: ${format}`,
          'UNSUPPORTED_FORMAT',
          400
        );
    }
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format date',
      'DATE_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to format
 * @param config - Date configuration options
 * @returns string - Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  config: Partial<DateConfig> = {}
): string {
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new FormatterError(
          'Invalid date string',
          'INVALID_DATE_STRING',
          400
        );
      }
    } else if (date instanceof Date) {
      dateObj = date;
      if (isNaN(dateObj.getTime())) {
        throw new FormatterError(
          'Invalid date object',
          'INVALID_DATE_OBJECT',
          400
        );
      }
    } else {
      throw new FormatterError(
        'Date must be a Date object or ISO string',
        'INVALID_DATE_TYPE',
        400
      );
    }

    const dateConfig = { ...DEFAULT_DATE_CONFIG, ...config };
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    // Use Intl.RelativeTimeFormat for better localization
    const rtf = new Intl.RelativeTimeFormat(dateConfig.locale, { numeric: 'auto' });

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format relative time',
      'RELATIVE_TIME_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format batch status with appropriate styling
 * @param status - Batch status
 * @param variant - Format variant
 * @returns object with formatted status information
 */
export function formatBatchStatus(
  status: BatchStatus
): {
  label: string;
  description: string;
  color: string;
  icon: string;
} {
  try {
    const statusMap: Record<BatchStatus, {
      label: string;
      description: string;
      color: string;
      icon: string;
    }> = {
      pickup: {
        label: 'Pickup',
        description: 'Items collected from client',
        color: 'blue',
        icon: '📦'
      },
      washing: {
        label: 'Washing',
        description: 'Items being washed and processed',
        color: 'yellow',
        icon: '🔄'
      },
      completed: {
        label: 'Completed',
        description: 'Batch successfully completed',
        color: 'green',
        icon: '✅'
      },
      delivered: {
        label: 'Delivered',
        description: 'Items delivered to client',
        color: 'purple',
        icon: '🚚'
      }
    };

    const statusInfo = statusMap[status];
    if (!statusInfo) {
      throw new FormatterError(
        `Unknown batch status: ${status}`,
        'UNKNOWN_STATUS',
        400
      );
    }

    return statusInfo;
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format batch status',
      'STATUS_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format numbers with appropriate separators and precision
 * @param number - Number to format
 * @param options - Formatting options
 * @returns string - Formatted number string
 */
export function formatNumber(
  number: number,
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
    compact?: boolean;
  } = {}
): string {
  try {
    if (typeof number !== 'number' || isNaN(number)) {
      throw new FormatterError(
        'Number must be a valid number',
        'INVALID_NUMBER',
        400
      );
    }

    const {
      locale = 'en-ZA',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
      useGrouping = true,
      compact = false
    } = options;

    if (compact && Math.abs(number) >= 1000) {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(number);
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    }).format(number);
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format number',
      'NUMBER_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format percentage with appropriate precision
 * @param value - Value to format as percentage
 * @param total - Total value for percentage calculation
 * @param options - Formatting options
 * @returns string - Formatted percentage string
 */
export function formatPercentage(
  value: number,
  total: number = 100,
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSign?: boolean;
  } = {}
): string {
  try {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new FormatterError(
        'Value must be a valid number',
        'INVALID_VALUE',
        400
      );
    }

    if (typeof total !== 'number' || isNaN(total) || total === 0) {
      throw new FormatterError(
        'Total must be a valid non-zero number',
        'INVALID_TOTAL',
        400
      );
    }

    const {
      locale = 'en-ZA',
      minimumFractionDigits = 1,
      maximumFractionDigits = 2,
      showSign = false
    } = options;

    const percentage = (value / total) * 100;
    const formatted = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(percentage / 100);

    return showSign && percentage > 0 ? `+${formatted}` : formatted;
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format percentage',
      'PERCENTAGE_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @param options - Formatting options
 * @returns string - Formatted file size string
 */
export function formatFileSize(
  bytes: number,
  options: {
    locale?: string;
    decimals?: number;
    binary?: boolean;
  } = {}
): string {
  try {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
      throw new FormatterError(
        'Bytes must be a valid non-negative number',
        'INVALID_BYTES',
        400
      );
    }

    const { locale = 'en-ZA', decimals = 2, binary = false } = options;

    if (bytes === 0) return '0 Bytes';

    const k = binary ? 1024 : 1000;
    const sizes = binary
      ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
      : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }).format(size) + ' ' + sizes[i];
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format file size',
      'FILE_SIZE_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Format phone number for South African format
 * @param phone - Phone number string
 * @param format - Format type
 * @returns string - Formatted phone number
 */
export function formatPhoneNumber(
  phone: string,
  format: 'international' | 'national' | 'local' = 'national'
): string {
  try {
    if (!phone || typeof phone !== 'string') {
      throw new FormatterError(
        'Phone must be a non-empty string',
        'INVALID_PHONE',
        400
      );
    }

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 9 || digits.length > 12) {
      throw new FormatterError(
        'Phone number must be between 9 and 12 digits',
        'INVALID_PHONE_LENGTH',
        400
      );
    }

    // Handle different South African phone number formats
    let formatted = digits;

    if (digits.startsWith('27')) {
      // International format starting with 27
      formatted = digits.substring(2);
    } else if (digits.startsWith('0')) {
      // National format starting with 0
      formatted = digits.substring(1);
    }

    // Ensure we have the right length (9 digits for South African mobile)
    if (formatted.length !== 9) {
      throw new FormatterError(
        'Invalid South African phone number format',
        'INVALID_PHONE_FORMAT',
        400
      );
    }

    switch (format) {
      case 'international':
        return `+27 ${formatted.substring(0, 2)} ${formatted.substring(2, 5)} ${formatted.substring(5)}`;
      
      case 'national':
        return `0${formatted.substring(0, 2)} ${formatted.substring(2, 5)} ${formatted.substring(5)}`;
      
      case 'local':
        return `${formatted.substring(0, 3)} ${formatted.substring(3, 6)} ${formatted.substring(6)}`;
      
      default:
        throw new FormatterError(
          `Unsupported phone format: ${format}`,
          'UNSUPPORTED_PHONE_FORMAT',
          400
        );
    }
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to format phone number',
      'PHONE_FORMATTING_ERROR',
      500
    );
  }
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - Ellipsis character (default: '...')
 * @returns string - Truncated text
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  try {
    if (typeof text !== 'string') {
      throw new FormatterError(
        'Text must be a string',
        'INVALID_TEXT',
        400
      );
    }

    if (typeof maxLength !== 'number' || maxLength < 0) {
      throw new FormatterError(
        'Max length must be a non-negative number',
        'INVALID_MAX_LENGTH',
        400
      );
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  } catch (error) {
    if (error instanceof FormatterError) {
      throw error;
    }
    throw new FormatterError(
      'Failed to truncate text',
      'TEXT_TRUNCATION_ERROR',
      500
    );
  }
}
