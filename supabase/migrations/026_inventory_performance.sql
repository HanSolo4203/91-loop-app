-- ==============================================
-- INVENTORY QUERY PERFORMANCE
-- ==============================================
-- chemical_stock_levels used to scan chemical_stock_movements twice:
-- once for on-hand litres and again for 14-day usage. Both totals now
-- come from one grouped pass.
--
-- chemical_last_end_kg is one row per product: the latest closed end
-- weight. The kiosk reads it instead of querying once per product.
-- status is in the ORDER BY so the row picked matches
-- idx_chemical_weigh_ins_last_end. Every filtered row has status
-- 'closed', so that extra sort key does not change the winner.
--
-- chemical_kiosk_stock is jug and drum litres only. The kiosk product
-- list reads chemical_products plus this view, and does not touch the
-- 14-day usage average.
--
-- Views use security_invoker so they obey RLS on the base tables.
-- Grants stay limited to service_role, matching the other inventory views.
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_chemical_stock_movements_product_type_occurred
    ON chemical_stock_movements (product_id, movement_type, occurred_on);

CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_last_end
    ON chemical_weigh_ins (product_id, status, shift_date DESC, end_recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_chemical_weigh_ins_status_shift_date
    ON chemical_weigh_ins (status, shift_date);

CREATE OR REPLACE VIEW chemical_stock_levels
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

CREATE OR REPLACE VIEW chemical_last_end_kg
WITH (security_invoker = true) AS
SELECT DISTINCT ON (product_id)
    product_id,
    end_kg
FROM chemical_weigh_ins
WHERE status = 'closed'
  AND end_kg IS NOT NULL
ORDER BY product_id, status, shift_date DESC, end_recorded_at DESC;

REVOKE ALL ON TABLE chemical_last_end_kg FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE chemical_last_end_kg TO service_role;

CREATE OR REPLACE VIEW chemical_kiosk_stock
WITH (security_invoker = true) AS
SELECT
    p.id,
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
      AND p.tracking_mode = 'decant'
) jug ON true;

REVOKE ALL ON TABLE chemical_kiosk_stock FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE chemical_kiosk_stock TO service_role;
