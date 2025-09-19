// Application constants
export const APP_NAME = '91 Loop App';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Professional business application built with Next.js 14';

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: '/users',
    DELETE: '/users',
  },
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    UPDATE: '/projects',
    DELETE: '/projects',
  },
  TASKS: {
    LIST: '/tasks',
    CREATE: '/tasks',
    UPDATE: '/tasks',
    DELETE: '/tasks',
  },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// Form validation rules
export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address',
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MESSAGE: 'Password must be at least 8 characters long',
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    MESSAGE: 'Name must be between 2 and 50 characters',
  },
  PHONE: {
    PATTERN: /^\+?[\d\s\-\(\)]+$/,
    MESSAGE: 'Please enter a valid phone number',
  },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Status options
export const STATUS_OPTIONS = {
  PROJECT: [
    { value: 'planning', label: 'Planning', color: 'blue' },
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'on-hold', label: 'On Hold', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'gray' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' },
  ],
  TASK: [
    { value: 'todo', label: 'To Do', color: 'gray' },
    { value: 'in-progress', label: 'In Progress', color: 'blue' },
    { value: 'review', label: 'Review', color: 'yellow' },
    { value: 'done', label: 'Done', color: 'green' },
  ],
  PRIORITY: [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' },
  ],
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;

// Company sizes
export const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-200)' },
  { value: 'large', label: 'Large (201-1000)' },
  { value: 'enterprise', label: 'Enterprise (1000+)' },
] as const;

// Industries
export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Media',
  'Other',
] as const;

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Language options
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  LONG: 'MMMM dd, yyyy',
  ISO: 'yyyy-MM-dd',
  DATETIME: 'MM/dd/yyyy HH:mm',
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  MAX_FILES: 5,
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An internal server error occurred.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  CREATED: 'Item created successfully.',
  UPDATED: 'Item updated successfully.',
  DELETED: 'Item deleted successfully.',
  LOGGED_IN: 'Welcome back!',
  LOGGED_OUT: 'You have been logged out.',
  PASSWORD_RESET: 'Password reset email sent.',
} as const;
