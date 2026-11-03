-- ==============================================
-- LAUNDRY CHEMICAL INVENTORY
-- ==============================================
-- Products, per-shift weigh-ins, and a litre ledger.
-- Stock on hand is the sum of chemical_stock_movements.litres.
-- All access is through API routes with the service role key.
-- RLS is enabled and no anon/authenticated policies are created,
-- so the Data API cannot read or write these tables.
-- ==============================================

-- Products (detergents and other chemicals)
CREATE TABLE IF NOT EXISTS chemical_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    supplier TEXT,
    container_size_l NUMERIC(8, 2) NOT NULL, -- e.g. 25 or 5
    reorder_level_l NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reorder_qty_containers INTEGER DEFAULT 1,
    cost_per_container NUMERIC(10, 2),
    kg_per_litre NUMERIC(6, 3) NOT NULL DEFAULT 1.0, -- 1 kg = 1 L for now; not shown in UI
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chemical_products_container_size_positive CHECK (container_size_l > 0),
    CONSTRAINT chemical_products_kg_per_litre_positive CHECK (kg_per_litre > 0)
);

-- One weigh-in per product per shift. Kiosk fills start, then end.
CREATE TABLE IF NOT EXISTS chemical_weigh_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES chemical_products(id) ON DELETE RESTRICT,
    shift_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    start_kg NUMERIC(8, 3) NOT NULL,
    start_employee_id UUID NOT NULL REFERENCES employees(id),
    start_recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    added_l NUMERIC(8, 3) NOT NULL DEFAULT 0, -- litres topped up during the shift
    end_kg NUMERIC(8, 3),
    end_employee_id UUID REFERENCES employees(id),
    end_recorded_at TIMESTAMP WITH TIME ZONE,
    used_kg NUMERIC(8, 3), -- start_kg + added_l * kg_per_litre - end_kg, set on close
    used_l NUMERIC(8, 3), -- used_kg / kg_per_litre
    notes TEXT,
    edited_by_admin BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    edited_by UUID, -- admin user id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (product_id, shift_date),
    CONSTRAINT chemical_weigh_ins_start_kg_nonnegative CHECK (start_kg >= 0),
    CONSTRAINT chemical_weigh_ins_end_kg_nonnegative CHECK (end_kg IS NULL OR end_kg >= 0)
);

-- Litre ledger. Positive litres are stock in; negative litres are stock out.
CREATE TABLE IF NOT EXISTS chemical_stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES chemical_products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('delivery', 'usage', 'adjustment', 'opening_balance')),
    litres NUMERIC(10, 3) NOT NULL, -- positive = in, negative = out
    containers NUMERIC(8, 2), -- for deliveries
    unit_cost NUMERIC(10, 2),
    reference TEXT, -- supplier invoice no., etc.
    weigh_in_id UUID UNIQUE REFERENCES chemical_weigh_ins(id) ON DELETE CASCADE,
    occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID, -- admin user id, null for kiosk usage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
-- product_id on weigh-ins is also covered by UNIQUE (product_id, shift_date)
CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_product_id ON chemical_weigh_ins(product_id);
CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_shift_date ON chemical_weigh_ins(shift_date);
CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_start_employee_id ON chemical_weigh_ins(start_employee_id);
CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_end_employee_id ON chemical_weigh_ins(end_employee_id);
CREATE INDEX IF NOT EXISTS idx_chemical_stock_movements_product_id ON chemical_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_chemical_stock_movements_occurred_on ON chemical_stock_movements(occurred_on);

-- updated_at triggers (products and weigh-ins; the ledger is insert-only)
CREATE OR REPLACE FUNCTION update_chemical_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chemical_products_updated_at ON chemical_products;
CREATE TRIGGER chemical_products_updated_at
    BEFORE UPDATE ON chemical_products
    FOR EACH ROW
    EXECUTE FUNCTION update_chemical_inventory_updated_at();

DROP TRIGGER IF EXISTS chemical_weigh_ins_updated_at ON chemical_weigh_ins;
CREATE TRIGGER chemical_weigh_ins_updated_at
    BEFORE UPDATE ON chemical_weigh_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_chemical_inventory_updated_at();

-- Enable RLS. No policies: anon and authenticated are denied.
-- The service role bypasses RLS for API routes.
ALTER TABLE chemical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_stock_movements ENABLE ROW LEVEL SECURITY;

-- One row per product. on_hand_l is the running sum of ledger litres.
-- avg_daily_use_l_14d is usage over the 14 calendar days ending today
-- (today back through today - 13), as a positive number, divided by 14.
-- Usage rows store negative litres, so the sum is negated.
-- security_invoker makes this view obey RLS on the base tables.
-- Without it, a view in public runs as the owner and bypasses RLS.
CREATE OR REPLACE VIEW chemical_stock_levels
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(stock.on_hand_l, 0) AS on_hand_l,
    COALESCE(stock.on_hand_l, 0) / p.container_size_l AS containers_on_hand,
    COALESCE(stock.on_hand_l, 0) <= p.reorder_level_l AS is_low,
    COALESCE(usage.usage_l_14d, 0) / 14.0 AS avg_daily_use_l_14d,
    COALESCE(stock.on_hand_l, 0)
        / NULLIF(COALESCE(usage.usage_l_14d, 0) / 14.0, 0) AS days_left,
    weighed.last_weighed_at
FROM chemical_products p
LEFT JOIN (
    SELECT product_id, SUM(litres) AS on_hand_l
    FROM chemical_stock_movements
    GROUP BY product_id
) stock ON stock.product_id = p.id
LEFT JOIN (
    SELECT
        product_id,
        GREATEST(COALESCE(SUM(-litres), 0), 0) AS usage_l_14d
    FROM chemical_stock_movements
    WHERE movement_type = 'usage'
      AND occurred_on >= (CURRENT_DATE - 13)
      AND occurred_on <= CURRENT_DATE
    GROUP BY product_id
) usage ON usage.product_id = p.id
LEFT JOIN (
    SELECT product_id, MAX(end_recorded_at) AS last_weighed_at
    FROM chemical_weigh_ins
    GROUP BY product_id
) weighed ON weighed.product_id = p.id;

REVOKE ALL ON TABLE chemical_stock_levels FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE chemical_stock_levels TO service_role;
