-- ==============================================
-- DRUM-TO-BOTTLE CHEMICAL STOCK
-- ==============================================
-- Some products (Aqualite) are poured from a large drum into a
-- smaller working bottle. Staff weigh only that bottle.
--
-- tracking_mode:
--   container — one container, start kg vs end kg (unchanged)
--   decant    — pour from the drum, weigh the small bottle
--
-- Bottle litres are not a second ledger. They are:
--   jug_baseline_l
--   + poured_l and mid-shift added_l
--   − usage
-- for weigh-ins that started at or after jug_baseline_at.
-- Drum litres are on_hand_l − bottle litres.
-- Usage is still the only stock-out movement.
-- ==============================================

ALTER TABLE chemical_products
    ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'container',
    ADD COLUMN IF NOT EXISTS issue_size_l NUMERIC(8, 2) NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS jug_baseline_l NUMERIC(10, 3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS jug_baseline_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

ALTER TABLE chemical_products
    DROP CONSTRAINT IF EXISTS chemical_products_tracking_mode_check;
ALTER TABLE chemical_products
    ADD CONSTRAINT chemical_products_tracking_mode_check
    CHECK (tracking_mode IN ('container', 'decant'));

ALTER TABLE chemical_products
    DROP CONSTRAINT IF EXISTS chemical_products_issue_size_positive;
ALTER TABLE chemical_products
    ADD CONSTRAINT chemical_products_issue_size_positive
    CHECK (issue_size_l > 0);

ALTER TABLE chemical_products
    DROP CONSTRAINT IF EXISTS chemical_products_jug_baseline_nonnegative;
ALTER TABLE chemical_products
    ADD CONSTRAINT chemical_products_jug_baseline_nonnegative
    CHECK (jug_baseline_l >= 0);

ALTER TABLE chemical_weigh_ins
    ADD COLUMN IF NOT EXISTS poured_l NUMERIC(8, 3) NOT NULL DEFAULT 0;

ALTER TABLE chemical_weigh_ins
    DROP CONSTRAINT IF EXISTS chemical_weigh_ins_poured_l_nonnegative;
ALTER TABLE chemical_weigh_ins
    ADD CONSTRAINT chemical_weigh_ins_poured_l_nonnegative
    CHECK (poured_l >= 0);

-- Existing rows get jug_baseline_at = transaction time via DEFAULT NOW(),
-- so historical usage is not treated as liquid already in the bottle.

DROP VIEW IF EXISTS chemical_stock_levels;

CREATE VIEW chemical_stock_levels
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(stock.on_hand_l, 0) AS on_hand_l,
    COALESCE(stock.on_hand_l, 0) / p.container_size_l AS containers_on_hand,
    COALESCE(stock.on_hand_l, 0) <= p.reorder_level_l AS is_low,
    COALESCE(usage.usage_l_14d, 0) / 14.0 AS avg_daily_use_l_14d,
    COALESCE(stock.on_hand_l, 0)
        / NULLIF(COALESCE(usage.usage_l_14d, 0) / 14.0, 0) AS days_left,
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
