-- ==============================================
-- RESET AND CREATE CLEAN LINEN TRACKING SYSTEM
-- ==============================================
-- This script resets the database and creates a clean schema
-- Use this if you're getting "type already exists" errors
-- ==============================================

-- ==============================================
-- 1. DROP EXISTING OBJECTS (if they exist)
-- ==============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS batch_items_detail_view CASCADE;
DROP VIEW IF EXISTS batch_report_view CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS search_batches(TEXT, UUID, batch_status, DATE, DATE, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_linen_category_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_client_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_batch_items_with_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_batch_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_batch_discrepancy() CASCADE;
DROP FUNCTION IF EXISTS update_batch_total_amount() CASCADE;
DROP FUNCTION IF EXISTS calculate_subtotal() CASCADE;
DROP FUNCTION IF EXISTS set_system_batch_id() CASCADE;
DROP FUNCTION IF EXISTS generate_system_batch_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS batch_items CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS linen_categories CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS batch_status CASCADE;

-- ==============================================
-- 2. CREATE CLEAN SCHEMA
-- ==============================================

-- Create enum for batch status
CREATE TYPE batch_status AS ENUM ('pickup', 'washing', 'completed', 'delivered');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create linen_categories table
CREATE TABLE linen_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price_per_item DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create batches table
CREATE TABLE batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paper_batch_id TEXT NOT NULL UNIQUE,
    system_batch_id TEXT NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    pickup_date DATE NOT NULL,
    status batch_status NOT NULL DEFAULT 'pickup',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    has_discrepancy BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create batch_items table
CREATE TABLE batch_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    linen_category_id UUID NOT NULL REFERENCES linen_categories(id) ON DELETE RESTRICT,
    quantity_sent INTEGER NOT NULL DEFAULT 0,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    price_per_item DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Linen categories indexes
CREATE INDEX idx_linen_categories_name ON linen_categories(name);
CREATE INDEX idx_linen_categories_is_active ON linen_categories(is_active);

-- Clients indexes
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_clients_contact_number ON clients(contact_number);

-- Batches indexes
CREATE INDEX idx_batches_paper_batch_id ON batches(paper_batch_id);
CREATE INDEX idx_batches_system_batch_id ON batches(system_batch_id);
CREATE INDEX idx_batches_client_id ON batches(client_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_pickup_date ON batches(pickup_date);
CREATE INDEX idx_batches_has_discrepancy ON batches(has_discrepancy);

-- Batch items indexes
CREATE INDEX idx_batch_items_batch_id ON batch_items(batch_id);
CREATE INDEX idx_batch_items_linen_category_id ON batch_items(linen_category_id);
CREATE INDEX idx_batch_items_quantity_sent ON batch_items(quantity_sent);
CREATE INDEX idx_batch_items_quantity_received ON batch_items(quantity_received);

-- ==============================================
-- 4. CREATE BUSINESS LOGIC FUNCTIONS
-- ==============================================

-- Create function to generate system batch ID
CREATE OR REPLACE FUNCTION generate_system_batch_id()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    new_batch_id TEXT;
BEGIN
    -- Get current year
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Generate 6-digit sequence number (padded with zeros)
    sequence_part := LPAD(
        (SELECT COALESCE(MAX(CAST(SUBSTRING(system_batch_id FROM 10) AS INTEGER)), 0) + 1 
         FROM batches 
         WHERE system_batch_id LIKE 'RSL-' || year_part || '-%')::TEXT, 
        6, '0'
    );
    
    -- Combine to create RSL-YYYY-XXXXXX format
    new_batch_id := 'RSL-' || year_part || '-' || sequence_part;
    
    RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically generate system_batch_id if not provided
CREATE OR REPLACE FUNCTION set_system_batch_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if system_batch_id is null or empty
    IF NEW.system_batch_id IS NULL OR NEW.system_batch_id = '' THEN
        NEW.system_batch_id := generate_system_batch_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate subtotal
CREATE OR REPLACE FUNCTION calculate_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate subtotal based on quantity_received and price_per_item
    NEW.subtotal := NEW.quantity_received * NEW.price_per_item;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update batch total amount when batch items change
CREATE OR REPLACE FUNCTION update_batch_total_amount()
RETURNS TRIGGER AS $$
DECLARE
    new_total DECIMAL(10,2);
BEGIN
    -- Calculate new total for the batch
    SELECT COALESCE(SUM(subtotal), 0.00)
    INTO new_total
    FROM batch_items
    WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id);
    
    -- Update the batch total
    UPDATE batches
    SET total_amount = new_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to check for discrepancies
CREATE OR REPLACE FUNCTION check_batch_discrepancy()
RETURNS TRIGGER AS $$
DECLARE
    batch_has_discrepancy BOOLEAN;
BEGIN
    -- Check if any items in the batch have discrepancies
    SELECT EXISTS(
        SELECT 1 
        FROM batch_items 
        WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        AND quantity_sent != quantity_received
    ) INTO batch_has_discrepancy;
    
    -- Update the batch discrepancy flag
    UPDATE batches
    SET has_discrepancy = batch_has_discrepancy,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 5. CREATE TRIGGERS
-- ==============================================

-- Updated_at triggers for all tables
CREATE TRIGGER update_linen_categories_updated_at 
    BEFORE UPDATE ON linen_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_items_updated_at 
    BEFORE UPDATE ON batch_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER set_batch_system_id
    BEFORE INSERT ON batches
    FOR EACH ROW
    EXECUTE FUNCTION set_system_batch_id();

CREATE TRIGGER calculate_batch_item_subtotal
    BEFORE INSERT OR UPDATE ON batch_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_subtotal();

CREATE TRIGGER update_batch_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON batch_items
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_total_amount();

CREATE TRIGGER check_batch_discrepancy_trigger
    AFTER INSERT OR UPDATE OR DELETE ON batch_items
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_discrepancy();

-- ==============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE linen_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 7. CREATE RLS POLICIES
-- ==============================================

-- Linen categories policies
CREATE POLICY "Allow read access to active linen categories" ON linen_categories
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Allow read access to all linen categories" ON linen_categories
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to linen categories" ON linen_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to linen categories" ON linen_categories
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access to linen categories" ON linen_categories
    FOR DELETE
    TO authenticated
    USING (true);

-- Clients policies
CREATE POLICY "Allow read access to active clients" ON clients
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Allow read access to all clients" ON clients
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to clients" ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to clients" ON clients
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access to clients" ON clients
    FOR DELETE
    TO authenticated
    USING (true);

-- Batches policies
CREATE POLICY "Allow read access to batches" ON batches
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to batches" ON batches
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to batches" ON batches
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access to batches" ON batches
    FOR DELETE
    TO authenticated
    USING (true);

-- Batch items policies
CREATE POLICY "Allow read access to batch items" ON batch_items
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to batch items" ON batch_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to batch items" ON batch_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access to batch items" ON batch_items
    FOR DELETE
    TO authenticated
    USING (true);

-- ==============================================
-- 8. CREATE UTILITY FUNCTIONS
-- ==============================================

-- Function to get batch summary with client information
CREATE OR REPLACE FUNCTION get_batch_summary(batch_uuid UUID)
RETURNS TABLE (
    batch_id UUID,
    paper_batch_id TEXT,
    system_batch_id TEXT,
    client_name TEXT,
    pickup_date DATE,
    status batch_status,
    total_amount DECIMAL(10,2),
    has_discrepancy BOOLEAN,
    item_count BIGINT,
    total_items_sent BIGINT,
    total_items_received BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.paper_batch_id,
        b.system_batch_id,
        c.name as client_name,
        b.pickup_date,
        b.status,
        b.total_amount,
        b.has_discrepancy,
        COUNT(bi.id) as item_count,
        SUM(bi.quantity_sent) as total_items_sent,
        SUM(bi.quantity_received) as total_items_received
    FROM batches b
    JOIN clients c ON b.client_id = c.id
    LEFT JOIN batch_items bi ON b.id = bi.batch_id
    WHERE b.id = batch_uuid
    GROUP BY b.id, b.paper_batch_id, b.system_batch_id, c.name, b.pickup_date, b.status, b.total_amount, b.has_discrepancy;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch items with linen category details
CREATE OR REPLACE FUNCTION get_batch_items_with_details(batch_uuid UUID)
RETURNS TABLE (
    item_id UUID,
    linen_category_name TEXT,
    quantity_sent INTEGER,
    quantity_received INTEGER,
    price_per_item DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    has_discrepancy BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bi.id as item_id,
        lc.name as linen_category_name,
        bi.quantity_sent,
        bi.quantity_received,
        bi.price_per_item,
        bi.subtotal,
        (bi.quantity_sent != bi.quantity_received) as has_discrepancy
    FROM batch_items bi
    JOIN linen_categories lc ON bi.linen_category_id = lc.id
    WHERE bi.batch_id = batch_uuid
    ORDER BY lc.name;
END;
$$ LANGUAGE plpgsql;

-- Function to search batches by various criteria
CREATE OR REPLACE FUNCTION search_batches(
    search_text TEXT DEFAULT NULL,
    client_id_filter UUID DEFAULT NULL,
    status_filter batch_status DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    has_discrepancy_filter BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    batch_id UUID,
    paper_batch_id TEXT,
    system_batch_id TEXT,
    client_name TEXT,
    pickup_date DATE,
    status batch_status,
    total_amount DECIMAL(10,2),
    has_discrepancy BOOLEAN,
    item_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as batch_id,
        b.paper_batch_id,
        b.system_batch_id,
        c.name as client_name,
        b.pickup_date,
        b.status,
        b.total_amount,
        b.has_discrepancy,
        COUNT(bi.id) as item_count
    FROM batches b
    JOIN clients c ON b.client_id = c.id
    LEFT JOIN batch_items bi ON b.id = bi.batch_id
    WHERE 
        (search_text IS NULL OR 
         b.paper_batch_id ILIKE '%' || search_text || '%' OR
         b.system_batch_id ILIKE '%' || search_text || '%' OR
         c.name ILIKE '%' || search_text || '%' OR
         b.notes ILIKE '%' || search_text || '%')
        AND (client_id_filter IS NULL OR b.client_id = client_id_filter)
        AND (status_filter IS NULL OR b.status = status_filter)
        AND (date_from IS NULL OR b.pickup_date >= date_from)
        AND (date_to IS NULL OR b.pickup_date <= date_to)
        AND (has_discrepancy_filter IS NULL OR b.has_discrepancy = has_discrepancy_filter)
    GROUP BY b.id, b.paper_batch_id, b.system_batch_id, c.name, b.pickup_date, b.status, b.total_amount, b.has_discrepancy
    ORDER BY b.pickup_date DESC, b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 9. CREATE VIEWS FOR REPORTING
-- ==============================================

-- Create view for easy batch reporting
CREATE VIEW batch_report_view AS
SELECT 
    b.id as batch_id,
    b.paper_batch_id,
    b.system_batch_id,
    c.name as client_name,
    c.contact_number,
    c.email,
    b.pickup_date,
    b.status,
    b.total_amount,
    b.has_discrepancy,
    b.notes,
    COUNT(bi.id) as item_count,
    SUM(bi.quantity_sent) as total_items_sent,
    SUM(bi.quantity_received) as total_items_received,
    b.created_at,
    b.updated_at
FROM batches b
JOIN clients c ON b.client_id = c.id
LEFT JOIN batch_items bi ON b.id = bi.batch_id
GROUP BY b.id, b.paper_batch_id, b.system_batch_id, c.name, c.contact_number, c.email, 
         b.pickup_date, b.status, b.total_amount, b.has_discrepancy, b.notes, b.created_at, b.updated_at;

-- Create view for batch items with full details
CREATE VIEW batch_items_detail_view AS
SELECT 
    bi.id as item_id,
    b.paper_batch_id,
    b.system_batch_id,
    c.name as client_name,
    lc.name as linen_category_name,
    lc.price_per_item as current_price,
    bi.quantity_sent,
    bi.quantity_received,
    bi.price_per_item as batch_price,
    bi.subtotal,
    (bi.quantity_sent != bi.quantity_received) as has_discrepancy,
    (bi.quantity_sent - bi.quantity_received) as discrepancy_amount,
    bi.created_at,
    bi.updated_at
FROM batch_items bi
JOIN batches b ON bi.batch_id = b.id
JOIN clients c ON b.client_id = c.id
JOIN linen_categories lc ON bi.linen_category_id = lc.id;

-- Grant permissions on views
GRANT SELECT ON batch_report_view TO authenticated;
GRANT SELECT ON batch_items_detail_view TO authenticated;

-- ==============================================
-- 10. INSERT SAMPLE DATA
-- ==============================================

-- Insert linen categories
INSERT INTO linen_categories (name, price_per_item) VALUES
    ('BATH TOWELS', 2.50),
    ('HAND TOWELS', 1.25),
    ('FACE TOWELS', 0.75),
    ('SINGLE FITTED SHEET', 3.00),
    ('KING FITTED SHEET', 4.50),
    ('SINGLE DUVET COVER', 4.00),
    ('KING DUVET COVER', 6.00),
    ('DUVET INNER SINGLE', 5.00),
    ('DUVET INNER KING', 7.50),
    ('SMALL PILLOWS', 2.00),
    ('SMALL PILLOW CASES', 1.50),
    ('PILLOW PROTECTORS', 1.00),
    ('MATT PROTECTORS (K)', 3.50),
    ('MATT PROTECTORS (S)', 2.50),
    ('WATERPROOF MATTRESS PROTECTOR', 4.00),
    ('SHOWER MATS', 1.75),
    ('SINGLE FLEECE', 2.25),
    ('DOUBLE FLEECE', 3.25);

-- Insert sample clients
INSERT INTO clients (name, contact_number, email, address) VALUES
    ('Hotel Grand Plaza', '+1-555-0101', 'manager@grandplaza.com', '123 Main Street, Downtown, NY 10001'),
    ('Boutique Inn', '+1-555-0102', 'info@boutiqueinn.com', '456 Oak Avenue, Midtown, NY 10002'),
    ('Business Hotel', '+1-555-0103', 'reservations@businesshotel.com', '789 Pine Street, Uptown, NY 10003'),
    ('Cozy Bed & Breakfast', '+1-555-0104', 'hello@cozybnb.com', '321 Elm Street, Suburb, NY 10004'),
    ('Luxury Resort', '+1-555-0105', 'concierge@luxuryresort.com', '654 Beach Road, Coastal, NY 10005');

-- ==============================================
-- RESET COMPLETE
-- ==============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database reset and clean schema created successfully!';
    RAISE NOTICE 'All existing objects have been dropped and recreated.';
    RAISE NOTICE 'Core tables: linen_categories, clients, batches, batch_items';
    RAISE NOTICE 'Views: batch_report_view, batch_items_detail_view';
    RAISE NOTICE 'Functions: get_batch_summary, get_batch_items_with_details, search_batches';
    RAISE NOTICE 'Business logic: Auto-generated batch IDs, calculated totals, discrepancy detection';
    RAISE NOTICE 'Row Level Security enabled on all tables';
    RAISE NOTICE 'Sample data inserted for testing';
END $$;
