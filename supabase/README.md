# Linen Tracking System - Database Schema

## Overview

This directory contains the refined database schema for the Linen Tracking System. The schema has been consolidated from multiple redundant migration files into a single, clean migration file.

## Migration Files

### `000_reset_and_create_clean_schema.sql`

This is the **single, consolidated migration file** that contains the complete database schema. It properly handles existing objects and creates a clean schema. It replaces the following redundant files that were previously creating duplicate tables:

- ~~`000_complete_linen_tracking_system.sql`~~ (removed - redundant)
- ~~`001_create_linen_categories.sql`~~ (removed - redundant)
- ~~`002_create_clients.sql`~~ (removed - redundant)
- ~~`003_create_batches.sql`~~ (removed - redundant)
- ~~`004_create_batch_items.sql`~~ (removed - redundant)
- ~~`005_create_utility_functions.sql`~~ (removed - redundant)

## Database Schema

### Core Tables

1. **`linen_categories`** - Types of linen items (towels, sheets, etc.)
   - `id` (UUID, Primary Key)
   - `name` (TEXT, Unique)
   - `price_per_item` (DECIMAL)
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **`clients`** - Customer information
   - `id` (UUID, Primary Key)
   - `name` (TEXT)
   - `contact_number` (TEXT)
   - `email` (TEXT)
   - `address` (TEXT)
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP)

3. **`batches`** - Linen batch records
   - `id` (UUID, Primary Key)
   - `paper_batch_id` (TEXT, Unique)
   - `system_batch_id` (TEXT, Unique, Auto-generated)
   - `client_id` (UUID, Foreign Key → clients.id)
   - `pickup_date` (DATE)
   - `status` (ENUM: 'pickup', 'washing', 'completed', 'delivered')
   - `total_amount` (DECIMAL, Auto-calculated)
   - `has_discrepancy` (BOOLEAN, Auto-calculated)
   - `notes` (TEXT)
   - `created_at`, `updated_at` (TIMESTAMP)

4. **`batch_items`** - Individual items within batches
   - `id` (UUID, Primary Key)
   - `batch_id` (UUID, Foreign Key → batches.id)
   - `linen_category_id` (UUID, Foreign Key → linen_categories.id)
   - `quantity_sent` (INTEGER)
   - `quantity_received` (INTEGER)
   - `price_per_item` (DECIMAL)
   - `subtotal` (DECIMAL, Auto-calculated)
   - `created_at`, `updated_at` (TIMESTAMP)

### Business Logic Features

1. **Auto-generated System Batch IDs**
   - Format: `RSL-YYYY-XXXXXX`
   - Automatically generated when creating new batches

2. **Automatic Calculations**
   - `subtotal` = `quantity_received` × `price_per_item`
   - `total_amount` = Sum of all item subtotals in a batch
   - `has_discrepancy` = True if any item has `quantity_sent ≠ quantity_received`

3. **Automatic Timestamps**
   - `created_at` and `updated_at` fields automatically maintained

### Views

1. **`batch_report_view`** - Comprehensive batch reporting
2. **`batch_items_detail_view`** - Detailed batch items with client and category info

### Functions

1. **`get_batch_summary(batch_uuid)`** - Get batch summary with client info
2. **`get_batch_items_with_details(batch_uuid)`** - Get batch items with category details
3. **`search_batches(...)`** - Advanced batch search with filters

### Security

- **Row Level Security (RLS)** enabled on all tables
- **Policies** configured for authenticated users
- **Views** have proper permissions granted

## Benefits of the Refined Schema

### ✅ Eliminated Redundancy
- **Before**: 6 separate migration files creating duplicate tables
- **After**: 1 consolidated migration file with clean structure

### ✅ Improved Maintainability
- Single source of truth for database schema
- Easier to understand and modify
- No conflicting table definitions

### ✅ Better Performance
- Optimized indexes on all frequently queried columns
- Efficient triggers for automatic calculations
- Proper foreign key relationships

### ✅ Enhanced Security
- Comprehensive RLS policies
- Proper authentication requirements
- Secure view permissions

### ✅ Business Logic Integration
- Automatic batch ID generation
- Real-time total calculations
- Discrepancy detection
- Consistent timestamp management

## Usage

### For a Fresh Database (Recommended)
To apply the refined schema to a new database:

```sql
-- Run the clean migration file
\i supabase/migrations/000_reset_and_create_clean_schema.sql
```

### For an Existing Database (If you get "type already exists" errors)
If you're getting errors like "type batch_status already exists", this means you have the old schema. The clean migration file will handle this by dropping and recreating everything:

```sql
-- This will drop all existing objects and create a clean schema
\i supabase/migrations/000_reset_and_create_clean_schema.sql
```

**⚠️ Warning**: The reset migration will drop all existing data. Make sure to backup any important data before running it.

The migration will:
1. Create all tables with proper relationships
2. Set up indexes for performance
3. Configure triggers for business logic
4. Enable security policies
5. Create utility functions and views
6. Insert sample data for testing

## Sample Data

The migration includes sample data:
- 18 linen categories (towels, sheets, pillows, etc.)
- 5 sample clients (hotels, B&Bs, resorts)
- Ready for creating test batches

## Next Steps

After applying this migration:
1. Verify all tables are created correctly
2. Test the business logic triggers
3. Confirm RLS policies are working
4. Create your first batch to test the system