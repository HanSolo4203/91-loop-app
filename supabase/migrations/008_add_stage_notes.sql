-- Migration: Add stage-specific notes columns to batches table
-- This allows tracking notes for washing, completed, and delivery stages separately

-- Add stage-specific notes columns
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS washing_notes TEXT,
ADD COLUMN IF NOT EXISTS completed_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN batches.washing_notes IS 'Notes added when batch moves to washing stage';
COMMENT ON COLUMN batches.completed_notes IS 'Notes added when batch moves to completed stage';
COMMENT ON COLUMN batches.delivery_notes IS 'Notes added when batch moves to delivered stage';








