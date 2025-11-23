-- Migration: Add express_delivery column to batch_items table
-- This allows marking items for express delivery with a 50% surcharge

-- Add express_delivery column to batch_items
ALTER TABLE batch_items
ADD COLUMN IF NOT EXISTS express_delivery BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN batch_items.express_delivery IS 'Indicates if this item requires express delivery (50% surcharge applies)';

-- Create index for filtering express delivery items
CREATE INDEX IF NOT EXISTS idx_batch_items_express_delivery ON batch_items(express_delivery);


