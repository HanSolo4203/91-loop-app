-- ==============================================
-- CLIENT LINEN LAYOUTS
-- ==============================================
-- Ordered linen checklist saved per client.
-- An empty table for a client means "no layout":
-- the batch page keeps the full catalog.
-- ==============================================

CREATE TABLE IF NOT EXISTS client_linen_layouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    linen_category_id UUID NOT NULL REFERENCES linen_categories(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (client_id, linen_category_id)
);

CREATE INDEX IF NOT EXISTS idx_client_linen_layouts_client_sort
    ON client_linen_layouts(client_id, sort_order);

DROP TRIGGER IF EXISTS client_linen_layouts_updated_at ON client_linen_layouts;
CREATE TRIGGER client_linen_layouts_updated_at
    BEFORE UPDATE ON client_linen_layouts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE client_linen_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access on client_linen_layouts" ON client_linen_layouts;
CREATE POLICY "Authenticated users full access on client_linen_layouts"
    ON client_linen_layouts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
