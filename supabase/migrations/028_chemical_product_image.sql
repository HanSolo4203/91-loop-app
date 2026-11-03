-- ==============================================
-- CHEMICAL PRODUCT PHOTO
-- ==============================================
-- image_url is a public storage URL for the bottle or bag photo.
-- chemical_stock_levels is recreated because p.* is fixed when the
-- view is created, and a new table column cannot be inserted ahead of
-- the view's computed columns with CREATE OR REPLACE.
-- ==============================================

ALTER TABLE chemical_products
    ADD COLUMN IF NOT EXISTS image_url TEXT;

DROP VIEW IF EXISTS chemical_stock_levels;

CREATE VIEW chemical_stock_levels
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(stock.on_hand_l, 0) AS on_hand_l,
    COALESCE(stock.on_hand_l, 0) / p.container_size_l AS containers_on_hand,
    COALESCE(stock.on_hand_l, 0) <= p.reorder_level_l AS is_low,
    COALESCE(stock.usage_l_14d, 0) / 14.0 AS avg_daily_use_l_14d,
    COALESCE(stock.on_hand_l, 0)
        / NULLIF(COALESCE(stock.usage_l_14d, 0) / 14.0, 0) AS days_left,
    weighed.last_weighed_at,
    CASE
        WHEN p.tracking_mode = 'decant'
            THEN p.jug_baseline_l + COALESCE(jug.jug_delta_l, 0)
        ELSE 0
    END AS jug_l,
    CASE
        WHEN p.tracking_mode = 'decant'
            THEN COALESCE(stock.on_hand_l, 0) - (p.jug_baseline_l + COALESCE(jug.jug_delta_l, 0))
        ELSE NULL
    END AS drum_l
FROM chemical_products p
LEFT JOIN (
    SELECT
        product_id,
        SUM(litres) AS on_hand_l,
        GREATEST(
            COALESCE(
                SUM(-litres) FILTER (
                    WHERE movement_type = 'usage'
                      AND occurred_on >= (CURRENT_DATE - 13)
                      AND occurred_on <= CURRENT_DATE
                ),
                0
            ),
            0
        ) AS usage_l_14d
    FROM chemical_stock_movements
    GROUP BY product_id
) stock ON stock.product_id = p.id
LEFT JOIN (
    SELECT product_id, MAX(end_recorded_at) AS last_weighed_at
    FROM chemical_weigh_ins
    GROUP BY product_id
) weighed ON weighed.product_id = p.id
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(
        CASE
            WHEN w.start_recorded_at >= p.jug_baseline_at AND w.status = 'open'
                THEN w.poured_l + w.added_l
            WHEN w.start_recorded_at >= p.jug_baseline_at AND w.status = 'closed'
                THEN w.poured_l + w.added_l - COALESCE(w.used_l, 0)
            ELSE 0
        END
    ), 0) AS jug_delta_l
    FROM chemical_weigh_ins w
    WHERE w.product_id = p.id
) jug ON true;

REVOKE ALL ON TABLE chemical_stock_levels FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE chemical_stock_levels TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chemical-product-photos', 'chemical-product-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload chemical product photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload chemical product photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chemical-product-photos');

DROP POLICY IF EXISTS "Authenticated users can read chemical product photos" ON storage.objects;
CREATE POLICY "Authenticated users can read chemical product photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'chemical-product-photos');

DROP POLICY IF EXISTS "Authenticated users can update chemical product photos" ON storage.objects;
CREATE POLICY "Authenticated users can update chemical product photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'chemical-product-photos');

DROP POLICY IF EXISTS "Authenticated users can delete chemical product photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete chemical product photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'chemical-product-photos');
