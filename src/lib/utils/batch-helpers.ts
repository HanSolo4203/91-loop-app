import type { BatchStatus, BatchItem, LinenCategory } from '@/types/database';

// Custom error class for batch helper errors
export class BatchHelperError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'BatchHelperError';
  }
}

// Helper result types
export interface BatchIdResult {
  paperBatchId: string;
  systemBatchId: string;
}

export interface DiscrepancyResult {
  hasDiscrepancy: boolean;
  totalDiscrepancy: number;
  discrepancyPercentage: number;
  itemsWithDiscrepancy: number;
  valueImpact: number;
  details: Array<{
    itemId: string;
    categoryName: string;
    quantitySent: number;
    quantityReceived: number;
    discrepancy: number;
    discrepancyPercentage: number;
    valueImpact: number;
  }>;
}

export interface FinancialCalculation {
  totalSentValue: number;
  totalReceivedValue: number;
  totalDiscrepancyValue: number;
  averageItemPrice: number;
  itemCount: number;
}

export interface StatusTransition {
  from: BatchStatus;
  to: BatchStatus;
  isValid: boolean;
  reason?: string;
}

/**
 * Generate a new paper batch ID based on current date and sequence
 * @param year - Year for the batch ID
 * @param month - Month for the batch ID (1-12)
 * @param sequence - Sequence number for the day
 * @returns string - Formatted paper batch ID
 */
export function generatePaperBatchId(
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1,
  sequence: number = 1
): string {
  try {
    // Validate inputs
    if (year < 2020 || year > 2030) {
      throw new BatchHelperError(
        'Year must be between 2020 and 2030',
        'INVALID_YEAR',
        400
      );
    }

    if (month < 1 || month > 12) {
      throw new BatchHelperError(
        'Month must be between 1 and 12',
        'INVALID_MONTH',
        400
      );
    }

    if (sequence < 1) {
      throw new BatchHelperError(
        'Sequence must be a positive number',
        'INVALID_SEQUENCE',
        400
      );
    }

    // Format: PB-YYYY-MM-XXX (e.g., PB-2024-01-001)
    const yearStr = year.toString();
    const monthStr = String(month).padStart(2, '0');
    const sequenceStr = String(sequence).padStart(3, '0');

    return `PB-${yearStr}-${monthStr}-${sequenceStr}`;
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to generate paper batch ID',
      'GENERATION_ERROR',
      500
    );
  }
}

/**
 * Validate paper batch ID format
 * @param paperBatchId - Paper batch ID to validate
 * @returns boolean - Whether the ID is valid
 */
export function validatePaperBatchId(paperBatchId: string): boolean {
  try {
    if (!paperBatchId || typeof paperBatchId !== 'string') {
      return false;
    }

    // Expected format: PB-YYYY-MM-XXX
    const pattern = /^PB-\d{4}-\d{2}-\d{3}$/;
    if (!pattern.test(paperBatchId)) {
      return false;
    }

    // Extract components
    const parts = paperBatchId.split('-');
    if (parts.length !== 4 || parts[0] !== 'PB') {
      return false;
    }

    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const sequence = parseInt(parts[3], 10);

    // Validate ranges
    if (year < 2020 || year > 2030) return false;
    if (month < 1 || month > 12) return false;
    if (sequence < 1 || sequence > 999) return false;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Parse paper batch ID to extract components
 * @param paperBatchId - Paper batch ID to parse
 * @returns object with year, month, sequence or null if invalid
 */
export function parsePaperBatchId(paperBatchId: string): {
  year: number;
  month: number;
  sequence: number;
} | null {
  try {
    if (!validatePaperBatchId(paperBatchId)) {
      return null;
    }

    const parts = paperBatchId.split('-');
    return {
      year: parseInt(parts[1], 10),
      month: parseInt(parts[2], 10),
      sequence: parseInt(parts[3], 10)
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate system batch ID (UUID-like format)
 * @returns string - System batch ID
 */
export function generateSystemBatchId(): string {
  try {
    // Generate a UUID-like string
    const timestamp = Date.now().toString(16);
    const randomPart = Math.random().toString(16).substring(2, 8);
    const extraRandom = Math.random().toString(16).substring(2, 8);
    
    return `${timestamp}-${randomPart}-${extraRandom}`;
  } catch (error) {
    throw new BatchHelperError(
      'Failed to generate system batch ID',
      'SYSTEM_ID_GENERATION_ERROR',
      500
    );
  }
}

/**
 * Validate status workflow transitions
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns StatusTransition - Validation result
 */
export function validateStatusTransition(
  fromStatus: BatchStatus,
  toStatus: BatchStatus
): StatusTransition {
  try {
    // Define valid transitions
    const validTransitions: Record<BatchStatus, BatchStatus[]> = {
      pickup: ['processing', 'cancelled'],
      processing: ['delivery', 'cancelled'],
      delivery: ['completed', 'cancelled'],
      completed: [], // No transitions from completed
      cancelled: [] // No transitions from cancelled
    };

    const isValid = validTransitions[fromStatus]?.includes(toStatus) || false;
    
    return {
      from: fromStatus,
      to: toStatus,
      isValid,
      reason: isValid ? undefined : `Invalid transition from ${fromStatus} to ${toStatus}`
    };
  } catch (error) {
    return {
      from: fromStatus,
      to: toStatus,
      isValid: false,
      reason: 'Error validating status transition'
    };
  }
}

/**
 * Detect discrepancies in batch items
 * @param items - Array of batch items
 * @param categories - Array of linen categories for pricing
 * @returns DiscrepancyResult - Detailed discrepancy analysis
 */
export function detectDiscrepancies(
  items: BatchItem[],
  categories: LinenCategory[] = []
): DiscrepancyResult {
  try {
    if (!items || !Array.isArray(items)) {
      throw new BatchHelperError(
        'Items must be a valid array',
        'INVALID_ITEMS',
        400
      );
    }

    let totalDiscrepancy = 0;
    let itemsWithDiscrepancy = 0;
    let totalSentValue = 0;
    let totalReceivedValue = 0;
    let totalValueImpact = 0;

    const details = items.map(item => {
      const quantityDiscrepancy = item.quantity_sent - item.quantity_received;
      const discrepancyPercentage = item.quantity_sent > 0 
        ? Math.abs(quantityDiscrepancy) / item.quantity_sent * 100 
        : 0;

      // Find category for pricing
      const category = categories.find(cat => cat.id === item.linen_category_id);
      const unitPrice = category?.unit_price || item.price_per_item || 0;
      
      const sentValue = item.quantity_sent * unitPrice;
      const receivedValue = item.quantity_received * unitPrice;
      const valueImpact = quantityDiscrepancy * unitPrice;

      totalSentValue += sentValue;
      totalReceivedValue += receivedValue;
      totalValueImpact += Math.abs(valueImpact);

      if (quantityDiscrepancy !== 0) {
        totalDiscrepancy += Math.abs(quantityDiscrepancy);
        itemsWithDiscrepancy++;
      }

      return {
        itemId: item.id,
        categoryName: category?.name || 'Unknown',
        quantitySent: item.quantity_sent,
        quantityReceived: item.quantity_received,
        discrepancy: quantityDiscrepancy,
        discrepancyPercentage,
        valueImpact
      };
    });

    const hasDiscrepancy = itemsWithDiscrepancy > 0;
    const discrepancyPercentage = items.length > 0 
      ? (itemsWithDiscrepancy / items.length) * 100 
      : 0;

    return {
      hasDiscrepancy,
      totalDiscrepancy,
      discrepancyPercentage,
      itemsWithDiscrepancy,
      valueImpact: totalValueImpact,
      details
    };
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to detect discrepancies',
      'DISCREPANCY_DETECTION_ERROR',
      500
    );
  }
}

/**
 * Calculate financial totals for batch items
 * @param items - Array of batch items
 * @param categories - Array of linen categories for pricing
 * @returns FinancialCalculation - Financial calculations
 */
export function calculateFinancialTotals(
  items: BatchItem[],
  categories: LinenCategory[] = []
): FinancialCalculation {
  try {
    if (!items || !Array.isArray(items)) {
      throw new BatchHelperError(
        'Items must be a valid array',
        'INVALID_ITEMS',
        400
      );
    }

    let totalSentValue = 0;
    let totalReceivedValue = 0;
    let totalDiscrepancyValue = 0;
    let totalItems = 0;

    items.forEach(item => {
      // Find category for pricing
      const category = categories.find(cat => cat.id === item.linen_category_id);
      const unitPrice = category?.unit_price || item.price_per_item || 0;

      const sentValue = item.quantity_sent * unitPrice;
      const receivedValue = item.quantity_received * unitPrice;
      const discrepancyValue = (item.quantity_sent - item.quantity_received) * unitPrice;

      totalSentValue += sentValue;
      totalReceivedValue += receivedValue;
      totalDiscrepancyValue += Math.abs(discrepancyValue);
      totalItems += item.quantity_sent;
    });

    const averageItemPrice = totalItems > 0 ? totalSentValue / totalItems : 0;

    return {
      totalSentValue,
      totalReceivedValue,
      totalDiscrepancyValue,
      averageItemPrice,
      itemCount: items.length
    };
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to calculate financial totals',
      'FINANCIAL_CALCULATION_ERROR',
      500
    );
  }
}

/**
 * Round currency amounts to 2 decimal places
 * @param amount - Amount to round
 * @returns number - Rounded amount
 */
export function roundCurrency(amount: number): number {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new BatchHelperError(
        'Amount must be a valid number',
        'INVALID_AMOUNT',
        400
      );
    }

    return Math.round(amount * 100) / 100;
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to round currency amount',
      'ROUNDING_ERROR',
      500
    );
  }
}

/**
 * Calculate percentage with proper rounding
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 2)
 * @returns number - Calculated percentage
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 2
): number {
  try {
    if (typeof value !== 'number' || typeof total !== 'number') {
      throw new BatchHelperError(
        'Value and total must be numbers',
        'INVALID_INPUT',
        400
      );
    }

    if (isNaN(value) || isNaN(total)) {
      throw new BatchHelperError(
        'Value and total cannot be NaN',
        'INVALID_INPUT',
        400
      );
    }

    if (total === 0) {
      return 0;
    }

    const percentage = (value / total) * 100;
    return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to calculate percentage',
      'PERCENTAGE_CALCULATION_ERROR',
      500
    );
  }
}

/**
 * Generate batch summary statistics
 * @param items - Array of batch items
 * @param categories - Array of linen categories
 * @returns object with summary statistics
 */
export function generateBatchSummary(
  items: BatchItem[],
  categories: LinenCategory[] = []
): {
  totalItems: number;
  totalValue: number;
  averageItemPrice: number;
  discrepancyCount: number;
  discrepancyPercentage: number;
  topCategory: string | null;
} {
  try {
    if (!items || !Array.isArray(items)) {
      throw new BatchHelperError(
        'Items must be a valid array',
        'INVALID_ITEMS',
        400
      );
    }

    const financialTotals = calculateFinancialTotals(items, categories);
    const discrepancyResult = detectDiscrepancies(items, categories);

    // Find top category by quantity
    const categoryTotals = new Map<string, number>();
    items.forEach(item => {
      const category = categories.find(cat => cat.id === item.linen_category_id);
      const categoryName = category?.name || 'Unknown';
      const currentTotal = categoryTotals.get(categoryName) || 0;
      categoryTotals.set(categoryName, currentTotal + item.quantity_sent);
    });

    const topCategory = categoryTotals.size > 0 
      ? Array.from(categoryTotals.entries())
          .sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      totalItems: items.reduce((sum, item) => sum + item.quantity_sent, 0),
      totalValue: financialTotals.totalSentValue,
      averageItemPrice: financialTotals.averageItemPrice,
      discrepancyCount: discrepancyResult.itemsWithDiscrepancy,
      discrepancyPercentage: discrepancyResult.discrepancyPercentage,
      topCategory
    };
  } catch (error) {
    if (error instanceof BatchHelperError) {
      throw error;
    }
    throw new BatchHelperError(
      'Failed to generate batch summary',
      'SUMMARY_GENERATION_ERROR',
      500
    );
  }
}

/**
 * Validate batch item quantities
 * @param quantitySent - Quantity sent
 * @param quantityReceived - Quantity received
 * @returns object with validation result
 */
export function validateBatchItemQuantities(
  quantitySent: number,
  quantityReceived: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate quantity sent
    if (typeof quantitySent !== 'number' || isNaN(quantitySent)) {
      errors.push('Quantity sent must be a valid number');
    } else if (quantitySent < 0) {
      errors.push('Quantity sent cannot be negative');
    } else if (quantitySent === 0) {
      warnings.push('Quantity sent is zero');
    }

    // Validate quantity received
    if (typeof quantityReceived !== 'number' || isNaN(quantityReceived)) {
      errors.push('Quantity received must be a valid number');
    } else if (quantityReceived < 0) {
      errors.push('Quantity received cannot be negative');
    }

    // Check for significant discrepancies
    if (quantitySent > 0 && quantityReceived >= 0) {
      const discrepancy = Math.abs(quantitySent - quantityReceived);
      const discrepancyPercentage = (discrepancy / quantitySent) * 100;

      if (discrepancyPercentage > 50) {
        warnings.push(`Large discrepancy detected: ${discrepancyPercentage.toFixed(1)}% difference`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Error validating quantities'],
      warnings: []
    };
  }
}
