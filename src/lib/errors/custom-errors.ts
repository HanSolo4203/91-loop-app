/**
 * Custom error classes for different application scenarios
 * Provides structured error handling with proper categorization
 */

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // File operation errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  additionalData?: Record<string, any>;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a safe format for client consumption
   */
  toSafeFormat(): {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
  } {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }

  /**
   * Convert error to detailed format for logging
   */
  toDetailedFormat(): {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    context?: ErrorContext;
    stack?: string;
    timestamp: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp
    };
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network request failed',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.NETWORK_ERROR, 0, context);
  }
}

export class TimeoutError extends AppError {
  constructor(
    message: string = 'Request timeout',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.TIMEOUT_ERROR, 408, context);
  }
}

/**
 * Authentication and authorization errors
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.UNAUTHORIZED, 401, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Access denied',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.FORBIDDEN, 403, context);
  }
}

export class TokenExpiredError extends AppError {
  constructor(
    message: string = 'Authentication token has expired',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.TOKEN_EXPIRED, 401, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, context);
    this.field = field;
    this.value = value;
  }
}

export class InvalidInputError extends AppError {
  constructor(
    message: string = 'Invalid input provided',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.INVALID_INPUT, 400, context);
  }
}

export class MissingRequiredFieldError extends AppError {
  constructor(
    fieldName: string,
    context?: ErrorContext
  ) {
    super(`Missing required field: ${fieldName}`, ErrorCode.MISSING_REQUIRED_FIELD, 400, context);
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.DATABASE_ERROR, 500, context);
  }
}

export class RecordNotFoundError extends AppError {
  constructor(
    resource: string = 'Record',
    identifier?: string,
    context?: ErrorContext
  ) {
    const message = identifier 
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, ErrorCode.RECORD_NOT_FOUND, 404, context);
  }
}

export class DuplicateRecordError extends AppError {
  constructor(
    resource: string = 'Record',
    field?: string,
    context?: ErrorContext
  ) {
    const message = field 
      ? `${resource} already exists with this ${field}`
      : `${resource} already exists`;
    super(message, ErrorCode.DUPLICATE_RECORD, 409, context);
  }
}

export class ConstraintViolationError extends AppError {
  constructor(
    message: string = 'Database constraint violation',
    context?: ErrorContext
  ) {
    super(message, ErrorCode.CONSTRAINT_VIOLATION, 409, context);
  }
}

/**
 * Business logic errors
 */
export class BusinessRuleViolationError extends AppError {
  constructor(
    rule: string,
    context?: ErrorContext
  ) {
    super(`Business rule violation: ${rule}`, ErrorCode.BUSINESS_RULE_VIOLATION, 422, context);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(
    action: string,
    context?: ErrorContext
  ) {
    super(`Insufficient permissions to ${action}`, ErrorCode.INSUFFICIENT_PERMISSIONS, 403, context);
  }
}

export class ResourceLockedError extends AppError {
  constructor(
    resource: string,
    context?: ErrorContext
  ) {
    super(`${resource} is currently locked`, ErrorCode.RESOURCE_LOCKED, 423, context);
  }
}

/**
 * File operation errors
 */
export class FileNotFoundError extends AppError {
  constructor(
    filename: string,
    context?: ErrorContext
  ) {
    super(`File not found: ${filename}`, ErrorCode.FILE_NOT_FOUND, 404, context);
  }
}

export class FileTooLargeError extends AppError {
  constructor(
    maxSize: string,
    context?: ErrorContext
  ) {
    super(`File size exceeds maximum allowed size of ${maxSize}`, ErrorCode.FILE_TOO_LARGE, 413, context);
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(
    allowedTypes: string[],
    context?: ErrorContext
  ) {
    super(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, ErrorCode.INVALID_FILE_TYPE, 415, context);
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message?: string,
    context?: ErrorContext
  ) {
    super(message || `External service error: ${service}`, ErrorCode.EXTERNAL_SERVICE_ERROR, 502, context);
  }
}

export class ApiRateLimitError extends AppError {
  constructor(
    service: string,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    const message = retryAfter 
      ? `Rate limit exceeded for ${service}. Retry after ${retryAfter} seconds`
      : `Rate limit exceeded for ${service}`;
    super(message, ErrorCode.API_RATE_LIMIT, 429, context);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    service: string,
    context?: ErrorContext
  ) {
    super(`Service unavailable: ${service}`, ErrorCode.SERVICE_UNAVAILABLE, 503, context);
  }
}

/**
 * Utility functions for error handling
 */

/**
 * Check if an error is an AppError instance
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Create an error context object
 */
export function createErrorContext(
  userId?: string,
  additionalData?: Record<string, any>
): ErrorContext {
  return {
    userId,
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    additionalData
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (isAppError(error)) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorCode.TIMEOUT_ERROR:
        return 'The request is taking longer than expected. Please try again.';
      case ErrorCode.UNAUTHORIZED:
        return 'Please log in to continue.';
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        return 'Please check your input and try again.';
      case ErrorCode.RECORD_NOT_FOUND:
        return 'The requested item was not found.';
      case ErrorCode.DUPLICATE_RECORD:
        return 'This item already exists.';
      case ErrorCode.FILE_TOO_LARGE:
        return 'The file is too large. Please choose a smaller file.';
      case ErrorCode.INVALID_FILE_TYPE:
        return 'The file type is not supported. Please choose a different file.';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get actionable suggestions for errors
 */
export function getErrorSuggestions(error: Error): string[] {
  if (isAppError(error)) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      case ErrorCode.UNAUTHORIZED:
        return [
          'Log in to your account',
          'Check if your session has expired',
          'Try logging out and back in'
        ];
      case ErrorCode.VALIDATION_ERROR:
        return [
          'Check all required fields are filled',
          'Verify the format of your input',
          'Try using different values'
        ];
      case ErrorCode.RECORD_NOT_FOUND:
        return [
          'Check if the item still exists',
          'Try refreshing the page',
          'Navigate back to the main page'
        ];
      case ErrorCode.FILE_TOO_LARGE:
        return [
          'Compress the file before uploading',
          'Choose a smaller file',
          'Contact support for large file uploads'
        ];
      case ErrorCode.INVALID_FILE_TYPE:
        return [
          'Check the file extension',
          'Convert to a supported format',
          'Choose a different file'
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if the problem continues'
        ];
    }
  }
  
  return [
    'Try refreshing the page',
    'Check your internet connection',
    'Contact support if the problem continues'
  ];
}
