-- Add discrepancy_details field to batch_items table
-- This allows users to add notes about what went wrong when there are discrepancies

ALTER TABLE batch_items 
ADD COLUMN discrepancy_details TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN batch_items.discrepancy_details IS 'Details about what caused the discrepancy when quantity_sent != quantity_received';

-- Drop the existing view first to avoid column type conflicts
DROP VIEW IF EXISTS batch_items_detail_view;

-- Recreate the batch_items_detail_view with the new field
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
    ((bi.quantity_sent - bi.quantity_received) * bi.price_per_item) as discrepancy_amount,
    bi.discrepancy_details,
    bi.created_at,
    bi.updated_at
FROM batch_items bi
JOIN batches b ON bi.batch_id = b.id
JOIN clients c ON b.client_id = c.id
JOIN linen_categories lc ON bi.linen_category_id = lc.id;

-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS get_batch_items_with_details(UUID);

-- Recreate the function to include discrepancy_details
CREATE FUNCTION get_batch_items_with_details(batch_uuid UUID)
RETURNS TABLE (
    item_id UUID,
    linen_category_name TEXT,
    quantity_sent INTEGER,
    quantity_received INTEGER,
    price_per_item DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    has_discrepancy BOOLEAN,
    discrepancy_details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bi.id,
        lc.name,
        bi.quantity_sent,
        bi.quantity_received,
        bi.price_per_item,
        bi.subtotal,
        (bi.quantity_sent != bi.quantity_received) as has_discrepancy,
        bi.discrepancy_details
    FROM batch_items bi
    JOIN linen_categories lc ON bi.linen_category_id = lc.id
    WHERE bi.batch_id = batch_uuid
    ORDER BY lc.name;
END;
$$ LANGUAGE plpgsql;
