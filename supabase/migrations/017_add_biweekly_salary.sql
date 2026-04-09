-- ==============================================
-- BI-WEEKLY SALARY PAYMENTS (two payments per month)
-- ==============================================
-- employees: monthly_salary, payment days, bank_reference
-- salary_payments: per-employee per-period payment records
-- ==============================================

-- Add columns to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS monthly_salary numeric(10,2),
  ADD COLUMN IF NOT EXISTS salary_payment_day_1 int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS salary_payment_day_2 int DEFAULT 15,
  ADD COLUMN IF NOT EXISTS bank_reference text;

-- Migrate existing bi_weekly_salary: set monthly_salary = bi_weekly_salary * 2
UPDATE employees SET monthly_salary = bi_weekly_salary * 2 WHERE bi_weekly_salary IS NOT NULL AND monthly_salary IS NULL;

-- salary_payments: one row per employee per half-month (payment 1 and 2)
CREATE TABLE IF NOT EXISTS salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  payment_number int NOT NULL CHECK (payment_number IN (1, 2)),
  period_month int NOT NULL,
  period_year int NOT NULL,
  gross_amount numeric(10,2) NOT NULL,
  deductions numeric(10,2) DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'skipped')),
  payment_method text DEFAULT 'bank_transfer',
  notes text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year, payment_number)
);

-- Indexes for salary_payments
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(status);

-- updated_at trigger for salary_payments
CREATE OR REPLACE FUNCTION update_salary_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS salary_payments_updated_at ON salary_payments;
CREATE TRIGGER salary_payments_updated_at
    BEFORE UPDATE ON salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_salary_payments_updated_at();

-- RLS
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on salary_payments" ON salary_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
