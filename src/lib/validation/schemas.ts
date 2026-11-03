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
  'washing',
  'completed',
  'delivered'
]);

export const ClientStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended'
]);

export const LinenCategoryStatusSchema = z.enum([
  'active',
  'inactive'
]);

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

// Chemical inventory
const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Invalid date');

function boundedAmount(label: string) {
  return z
    .number()
    .min(0, `${label} must be 0 or more`)
    .lt(1000, `${label} must be below 1000`);
}

const LitreSchema = boundedAmount('Litres');
const WeightSchema = boundedAmount('Weight');

const OptionalTrimmedTextSchema = z.string().trim().max(2000).optional().nullable();

function withDateOrder<T extends z.ZodType<{ from?: string; to?: string }>>(schema: T) {
  return schema.refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    { message: 'from must be on or before to' }
  );
}

const chemicalProductFields = {
  name: z.string().trim().min(1, 'Product name is required').max(255, 'Product name must be less than 255 characters'),
  supplier: z.string().trim().max(255).optional().nullable(),
  container_size_l: z
    .number()
    .positive('Container size must be greater than 0')
    .max(999999.99, 'Container size is too large'),
  reorder_level_l: LitreSchema.optional(),
  reorder_qty_containers: z.number().int().min(0).max(100000).optional().nullable(),
  cost_per_container: z.number().min(0).max(999999.99).optional().nullable(),
  kg_per_litre: z.number().positive('kg per litre must be greater than 0').lt(1000).optional(),
  notes: OptionalTrimmedTextSchema,
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(100000).optional(),
};

export const CreateChemicalProductSchema = z.object({
  ...chemicalProductFields,
  opening_stock_l: LitreSchema.optional().nullable(),
}).strict();

export const UpdateChemicalProductSchema = z.object(chemicalProductFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' }
);

export const RecordDeliverySchema = z.object({
  product_id: BaseIdSchema,
  containers: z.number().positive('Containers must be greater than 0').lt(100000),
  litres: LitreSchema.optional(),
  unit_cost: z.number().min(0, 'Unit cost must be 0 or more').max(999999.99).optional().nullable(),
  reference: z.string().trim().max(255).optional().nullable(),
  occurred_on: DateOnlySchema,
  note: OptionalTrimmedTextSchema,
}).strict();

export const RecordStockTakeSchema = z.object({
  product_id: BaseIdSchema,
  counted_litres: LitreSchema,
  note: OptionalTrimmedTextSchema,
}).strict();

export const AdminUpdateWeighInSchema = z.object({
  start_kg: WeightSchema.optional(),
  end_kg: WeightSchema.nullable().optional(),
  added_l: LitreSchema.optional(),
  notes: OptionalTrimmedTextSchema,
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' }
);

export const MovementListQuerySchema = withDateOrder(z.object({
  product_id: BaseIdSchema.optional(),
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  type: z.enum(['delivery', 'usage', 'adjustment', 'opening_balance']).optional(),
}).strict());

export const DeliveryListQuerySchema = withDateOrder(z.object({
  product_id: BaseIdSchema.optional(),
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
}).strict());

export const WeighInListQuerySchema = withDateOrder(z.object({
  product_id: BaseIdSchema.optional(),
  employee_id: BaseIdSchema.optional(),
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  status: z.enum(['open', 'closed']).optional(),
}).strict());

export const UsageQuerySchema = withDateOrder(z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
}).strict());

/** Kiosk scale: 0 ≤ kg < 100. Admin edits still use the wider WeightSchema. */
const KioskWeightSchema = z
  .number()
  .min(0, 'Weight must be 0 or more')
  .lt(100, 'Weight must be below 100');

const ClockPinSchema = z.string().trim().regex(/^\d{4}$/, 'Invalid PIN');

export const KioskStartWeighInSchema = z.object({
  pin: ClockPinSchema,
  product_id: BaseIdSchema,
  start_kg: KioskWeightSchema,
  notes: OptionalTrimmedTextSchema,
}).strict();

export const KioskEndWeighInSchema = z.object({
  pin: ClockPinSchema,
  weigh_in_id: BaseIdSchema,
  end_kg: KioskWeightSchema,
  added_l: LitreSchema.default(0),
  notes: OptionalTrimmedTextSchema,
  confirm_high_usage: z.boolean().optional(),
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
      const errorMessages = error.issues.map(err => {
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
      const errorMessages = result.error.issues.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
      
      return {
        success: false,
        error: errorMessages.join(', ')
      };
    }
  } catch {
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

export type CreateChemicalProductInput = z.infer<typeof CreateChemicalProductSchema>;
export type UpdateChemicalProductInput = z.infer<typeof UpdateChemicalProductSchema>;
export type RecordDeliveryInput = z.infer<typeof RecordDeliverySchema>;
export type RecordStockTakeInput = z.infer<typeof RecordStockTakeSchema>;
export type AdminUpdateWeighInInput = z.infer<typeof AdminUpdateWeighInSchema>;
export type MovementListQuery = z.infer<typeof MovementListQuerySchema>;
export type DeliveryListQuery = z.infer<typeof DeliveryListQuerySchema>;
export type WeighInListQuery = z.infer<typeof WeighInListQuerySchema>;
export type UsageQuery = z.infer<typeof UsageQuerySchema>;
export type KioskStartWeighInInput = z.infer<typeof KioskStartWeighInSchema>;
export type KioskEndWeighInInput = z.infer<typeof KioskEndWeighInSchema>;
