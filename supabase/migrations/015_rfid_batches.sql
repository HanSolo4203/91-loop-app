-- ==============================================
-- RSL EXPRESS RFID BATCHES WORKFLOW
-- ==============================================
-- Add price_per_wash to linen_categories
-- Create rfid_batches, rfid_batch_items, rfid_items
-- ==============================================

-- Add price_per_wash column to linen_categories (nullable, fallback to price_per_item)
ALTER TABLE linen_categories 
ADD COLUMN IF NOT EXISTS price_per_wash DECIMAL(12, 2);

-- Set RSL Express wash pricing for key categories
-- Bed Sheets: R12.50 (Fitted/Flat sheets)
UPDATE linen_categories SET price_per_wash = 12.50 
WHERE name LIKE 'Fitted Sheet%' OR name LIKE 'Flat Sheet%';

-- Duvet Covers: R18.00
UPDATE linen_categories SET price_per_wash = 18.00 
WHERE name LIKE 'Duvet Covers%';

-- Pillow Cases: R6.50
UPDATE linen_categories SET price_per_wash = 6.50 
WHERE name LIKE 'Pillow Cases%';

-- For other categories, use price_per_item as fallback
UPDATE linen_categories 
SET price_per_wash = COALESCE(price_per_wash, price_per_item)
WHERE price_per_wash IS NULL;

-- Create rfid_items (master list of RFID tags with lifecycle)
CREATE TABLE IF NOT EXISTS rfid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfid_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    total_washes_lifetime INTEGER NOT NULL DEFAULT 0,
    washes_remaining INTEGER NOT NULL DEFAULT 500,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'near_end', 'retired')),
    last_seen TIMESTAMP WITH TIME ZONE,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rfid_batches
CREATE TABLE IF NOT EXISTS rfid_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_ref TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    scanned_by TEXT,
    scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_washes INTEGER NOT NULL DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'invoiced', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rfid_batch_items
CREATE TABLE IF NOT EXISTS rfid_batch_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES rfid_batches(id) ON DELETE CASCADE,
    rfid_number TEXT NOT NULL,
    category TEXT NOT NULL,
    qty_washed_this_batch INTEGER NOT NULL DEFAULT 1,
    washes_remaining_after INTEGER NOT NULL,
    price_per_wash DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfid_items_rfid_number ON rfid_items(rfid_number);
CREATE INDEX IF NOT EXISTS idx_rfid_items_status ON rfid_items(status);
CREATE INDEX IF NOT EXISTS idx_rfid_items_category ON rfid_items(category);

CREATE INDEX IF NOT EXISTS idx_rfid_batches_batch_ref ON rfid_batches(batch_ref);
CREATE INDEX IF NOT EXISTS idx_rfid_batches_scan_date ON rfid_batches(scan_date);
CREATE INDEX IF NOT EXISTS idx_rfid_batches_status ON rfid_batches(status);

CREATE INDEX IF NOT EXISTS idx_rfid_batch_items_batch_id ON rfid_batch_items(batch_id);

-- Updated_at trigger for rfid_items
CREATE OR REPLACE FUNCTION update_rfid_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rfid_items_updated_at ON rfid_items;
CREATE TRIGGER rfid_items_updated_at
    BEFORE UPDATE ON rfid_items
    FOR EACH ROW
    EXECUTE FUNCTION update_rfid_items_updated_at();

-- Enable RLS
ALTER TABLE rfid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users full access
CREATE POLICY "Authenticated users full access on rfid_items" ON rfid_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on rfid_batches" ON rfid_batches
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on rfid_batch_items" ON rfid_batch_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
