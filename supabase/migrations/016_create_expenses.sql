-- ==============================================
-- RSL EXPRESS BUSINESS EXPENSES
-- ==============================================
-- Track monthly operating costs and profitability
-- ==============================================

-- Create expenses_categories table
CREATE TABLE IF NOT EXISTS expenses_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_fixed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES expenses_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_expenses_period_year ON expenses(period_year);
CREATE INDEX IF NOT EXISTS idx_expenses_period_month ON expenses(period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_period ON expenses(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_is_recurring ON expenses(is_recurring);

-- Updated_at trigger for expenses
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- Seed default expense categories
INSERT INTO expenses_categories (name, icon, is_fixed) VALUES
    ('Rent', 'Building2', true),
    ('Electricity', 'Zap', false),
    ('Water', 'Droplets', false),
    ('Staff Wages', 'Users', true),
    ('Equipment', 'Wrench', false),
    ('Supplies', 'Package', false),
    ('Insurance', 'ShieldCheck', true),
    ('Fuel', 'Fuel', false),
    ('Other', 'CircleDollarSign', false)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE expenses_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users full access
CREATE POLICY "Authenticated users full access on expenses_categories" ON expenses_categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on expenses" ON expenses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create expense-receipts storage bucket for receipt uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for expense-receipts bucket
DROP POLICY IF EXISTS "Authenticated users can upload expense receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload expense receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "Authenticated users can read expense receipts" ON storage.objects;
CREATE POLICY "Authenticated users can read expense receipts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "Authenticated users can update expense receipts" ON storage.objects;
CREATE POLICY "Authenticated users can update expense receipts"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "Authenticated users can delete expense receipts" ON storage.objects;
CREATE POLICY "Authenticated users can delete expense receipts"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'expense-receipts');
