-- ==============================================
-- CREATE RFID INVOICES AND INVOICE ITEMS TABLES
-- ==============================================
-- For storing RFID batch invoices
-- ==============================================

CREATE TABLE IF NOT EXISTS rfid_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    generated_by TEXT,
    period_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_items INTEGER NOT NULL DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfid_invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfid_invoice_id UUID NOT NULL REFERENCES rfid_invoices(id) ON DELETE CASCADE,
    rfid_number TEXT NOT NULL,
    category TEXT NOT NULL,
    qty_washed INTEGER NOT NULL DEFAULT 0,
    washes_remaining INTEGER NOT NULL DEFAULT 0,
    price_per_wash DECIMAL(12, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfid_invoices_invoice_number ON rfid_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_rfid_invoices_period_date ON rfid_invoices(period_date);
CREATE INDEX IF NOT EXISTS idx_rfid_invoices_created_at ON rfid_invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_rfid_invoice_items_invoice_id ON rfid_invoice_items(rfid_invoice_id);
