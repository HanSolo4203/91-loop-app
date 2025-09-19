import { z } from 'zod';

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Base schemas
export const BaseIdSchema = z.string().uuid('Invalid ID format');

export const BaseTimestampSchema = z.string().datetime('Invalid timestamp format');

// Status enums
export const BatchStatusSchema = z.enum([
  'pickup',
  'processing', 
  'delivery',
  'completed',
  'cancelled'
], {
  errorMap: () => ({ message: 'Invalid batch status' })
});

export const ClientStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended'
], {
  errorMap: () => ({ message: 'Invalid client status' })
});

export const LinenCategoryStatusSchema = z.enum([
  'active',
  'inactive'
], {
  errorMap: () => ({ message: 'Invalid linen category status' })
});

// Client schemas
export const ClientSchema = z.object({
  id: BaseIdSchema.optional(),
  name: z.string()
    .min(1, 'Client name is required')
    .max(255, 'Client name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, 'Client name contains invalid characters'),
  
  contact_person: z.string()
    .max(255, 'Contact person name must be less than 255 characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  billing_address: z.string()
    .max(500, 'Billing address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  status: ClientStatusSchema.default('active'),
  
  created_at: BaseTimestampSchema.optional(),
  updated_at: BaseTimestampSchema.optional()
}).strict();

export const CreateClientSchema = ClientSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateClientSchema = ClientSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true
});

// Linen category schemas
export const LinenCategorySchema = z.object({
  id: BaseIdSchema.optional(),
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, 'Category name contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  unit_price: z.number()
    .positive('Unit price must be positive')
    .max(999999.99, 'Unit price must be less than R1,000,000')
    .multipleOf(0.01, 'Unit price must have at most 2 decimal places'),
  
  is_active: z.boolean().default(true),
  
  created_at: BaseTimestampSchema.optional(),
  updated_at: BaseTimestampSchema.optional()
}).strict();

export const CreateLinenCategorySchema = LinenCategorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateLinenCategorySchema = LinenCategorySchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true
});

// Batch item schemas
export const BatchItemSchema = z.object({
  id: BaseIdSchema.optional(),
  batch_id: BaseIdSchema,
  linen_category_id: BaseIdSchema,
  
  quantity_sent: z.number()
    .int('Quantity sent must be an integer')
    .min(0, 'Quantity sent cannot be negative')
    .max(10000, 'Quantity sent cannot exceed 10,000'),
  
  quantity_received: z.number()
    .int('Quantity received must be an integer')
    .min(0, 'Quantity received cannot be negative')
    .max(10000, 'Quantity received cannot exceed 10,000'),
  
  price_per_item: z.number()
    .positive('Price per item must be positive')
    .max(999999.99, 'Price per item must be less than R1,000,000')
    .multipleOf(0.01, 'Price per item must have at most 2 decimal places'),
  
  created_at: BaseTimestampSchema.optional(),
  updated_at: BaseTimestampSchema.optional()
}).strict();

export const CreateBatchItemSchema = BatchItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateBatchItemSchema = BatchItemSchema.partial().omit({
  id: true,
  batch_id: true,
  created_at: true,
  updated_at: true
});

// Batch schemas
export const BatchSchema = z.object({
  id: BaseIdSchema.optional(),
  paper_batch_id: z.string()
    .min(1, 'Paper batch ID is required')
    .max(50, 'Paper batch ID must be less than 50 characters')
    .regex(/^PB-\d{4}-\d{2}-\d{3}$/, 'Invalid paper batch ID format'),
  
  client_id: BaseIdSchema,
  
  pickup_date: z.string()
    .datetime('Invalid pickup date format'),
  
  delivery_date: z.string()
    .datetime('Invalid delivery date format')
    .optional(),
  
  status: BatchStatusSchema.default('pickup'),
  
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  
  total_amount: z.number()
    .min(0, 'Total amount cannot be negative')
    .max(99999999.99, 'Total amount must be less than R100,000,000')
    .multipleOf(0.01, 'Total amount must have at most 2 decimal places')
    .optional(),
  
  created_at: BaseTimestampSchema.optional(),
  updated_at: BaseTimestampSchema.optional()
}).strict();

export const CreateBatchSchema = BatchSchema.omit({
  id: true,
  total_amount: true,
  created_at: true,
  updated_at: true
}).extend({
  items: z.array(CreateBatchItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Cannot have more than 100 items per batch')
});

export const UpdateBatchSchema = BatchSchema.partial().omit({
  id: true,
  paper_batch_id: true,
  client_id: true,
  created_at: true,
  updated_at: true
});

export const BatchStatusUpdateSchema = z.object({
  status: BatchStatusSchema,
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal(''))
}).strict();

// Pricing update schema
export const PricingUpdateSchema = z.object({
  category_id: BaseIdSchema,
  new_price: z.number()
    .positive('New price must be positive')
    .max(999999.99, 'New price must be less than R1,000,000')
    .multipleOf(0.01, 'New price must have at most 2 decimal places')
}).strict();

export const BulkPricingUpdateSchema = z.object({
  updates: z.array(PricingUpdateSchema)
    .min(1, 'At least one pricing update is required')
    .max(50, 'Cannot update more than 50 categories at once')
}).strict();

// Query parameter schemas
export const BatchQuerySchema = z.object({
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  
  offset: z.coerce.number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0),
  
  status: z.union([BatchStatusSchema, z.array(BatchStatusSchema)]).optional(),
  
  client_id: BaseIdSchema.optional(),
  
  date_from: z.string()
    .datetime('Invalid date_from format')
    .optional(),
  
  date_to: z.string()
    .datetime('Invalid date_to format')
    .optional(),
  
  search: z.string()
    .max(100, 'Search term must be less than 100 characters')
    .optional(),
  
  has_discrepancy: z.coerce.boolean().optional()
}).strict();

export const RevenueQuerySchema = z.object({
  date_from: z.string()
    .datetime('Invalid date_from format')
    .optional(),
  
  date_to: z.string()
    .datetime('Invalid date_to format')
    .optional(),
  
  client_id: BaseIdSchema.optional(),
  
  group_by: z.enum(['day', 'week', 'month', 'year'])
    .default('month')
}).strict();

export const DiscrepancyQuerySchema = z.object({
  date_from: z.string()
    .datetime('Invalid date_from format')
    .optional(),
  
  date_to: z.string()
    .datetime('Invalid date_to format')
    .optional(),
  
  threshold: z.coerce.number()
    .min(0, 'Threshold cannot be negative')
    .max(100, 'Threshold cannot exceed 100%')
    .default(5),
  
  client_id: BaseIdSchema.optional()
}).strict();

// API request/response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable(),
  data: z.any().nullable()
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    page: z.number().int().min(1),
    total_pages: z.number().int().min(0),
    has_more: z.boolean()
  })
});

// File upload schemas
export const FileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters'),
  
  mimetype: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/, 'Invalid MIME type'),
  
  size: z.number()
    .int('File size must be an integer')
    .min(1, 'File size must be positive')
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
  
  buffer: z.instanceof(Buffer)
}).strict();

export const ImageUploadSchema = FileUploadSchema.extend({
  mimetype: z.enum([
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ]),
  size: z.number()
    .int('File size must be an integer')
    .min(1, 'File size must be positive')
    .max(5 * 1024 * 1024, 'Image size cannot exceed 5MB') // 5MB limit for images
});

// Dashboard query schemas
export const DashboardStatsQuerySchema = z.object({
  month: z.coerce.number()
    .int('Month must be an integer')
    .min(0, 'Month must be between 0 and 11')
    .max(11, 'Month must be between 0 and 11'),
  
  year: z.coerce.number()
    .int('Year must be an integer')
    .min(2020, 'Year must be 2020 or later')
    .max(2030, 'Year must be 2030 or earlier'),
  
  type: z.enum(['overview', 'monthly', 'revenue', 'clients', 'discrepancies'])
    .default('overview')
}).strict();

// Validation helper functions
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
      
      throw new ValidationError(
        `${context ? `${context}: ` : ''}${errorMessages.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }
    
    throw new ValidationError(
      `${context ? `${context}: ` : ''}Validation failed`,
      'VALIDATION_ERROR',
      400
    );
  }
}

export function validateSchemaSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      const errorMessages = result.error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
      
      return {
        success: false,
        error: errorMessages.join(', ')
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Validation failed'
    };
  }
}

// Type exports for use in other files
export type Client = z.infer<typeof ClientSchema>;
export type CreateClient = z.infer<typeof CreateClientSchema>;
export type UpdateClient = z.infer<typeof UpdateClientSchema>;

export type LinenCategory = z.infer<typeof LinenCategorySchema>;
export type CreateLinenCategory = z.infer<typeof CreateLinenCategorySchema>;
export type UpdateLinenCategory = z.infer<typeof UpdateLinenCategorySchema>;

export type BatchItem = z.infer<typeof BatchItemSchema>;
export type CreateBatchItem = z.infer<typeof CreateBatchItemSchema>;
export type UpdateBatchItem = z.infer<typeof UpdateBatchItemSchema>;

export type Batch = z.infer<typeof BatchSchema>;
export type CreateBatch = z.infer<typeof CreateBatchSchema>;
export type UpdateBatch = z.infer<typeof UpdateBatchSchema>;

export type BatchQuery = z.infer<typeof BatchQuerySchema>;
export type RevenueQuery = z.infer<typeof RevenueQuerySchema>;
export type DiscrepancyQuery = z.infer<typeof DiscrepancyQuerySchema>;

export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ImageUpload = z.infer<typeof ImageUploadSchema>;

export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
