-- ==============================================
-- CREATE STAFF MANAGEMENT TABLES
-- ==============================================
-- employees, shift_schedule, absences, payroll_runs, payroll_entries
-- ==============================================

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night', 'both')),
    bi_weekly_salary NUMERIC(12,2) DEFAULT 0,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_branch_code TEXT,
    account_type TEXT CHECK (account_type IN ('cheque', 'savings')),
    id_number TEXT,
    id_document_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_schedule table
CREATE TABLE IF NOT EXISTS shift_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
    is_default BOOLEAN NOT NULL DEFAULT true,
    week_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create absences table
CREATE TABLE IF NOT EXISTS absences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
    cover_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    total_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payroll_entries table
CREATE TABLE IF NOT EXISTS payroll_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    bi_weekly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions NUMERIC(12,2) DEFAULT 0,
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_shift_schedule_employee_id ON shift_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedule_week ON shift_schedule(week_start_date);
CREATE INDEX IF NOT EXISTS idx_absences_employee_id ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_run_id ON payroll_entries(payroll_run_id);

-- Create updated_at trigger function for employees (if not exists - reuse or create)
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for employees updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users get full access
CREATE POLICY "Authenticated users full access on employees" ON employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on shift_schedule" ON shift_schedule
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on absences" ON absences
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on payroll_runs" ON payroll_runs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on payroll_entries" ON payroll_entries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create staff-documents storage bucket for ID document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-documents', 'staff-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for staff-documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload staff documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload staff documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'staff-documents');

DROP POLICY IF EXISTS "Authenticated users can read staff documents" ON storage.objects;
CREATE POLICY "Authenticated users can read staff documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'staff-documents');

DROP POLICY IF EXISTS "Authenticated users can update staff documents" ON storage.objects;
CREATE POLICY "Authenticated users can update staff documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'staff-documents');

DROP POLICY IF EXISTS "Authenticated users can delete staff documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete staff documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'staff-documents');
