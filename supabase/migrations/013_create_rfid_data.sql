-- ==============================================
-- CREATE RFID DATA TABLE
-- ==============================================
-- For RFID laundry tracking functionality
-- ==============================================

CREATE TABLE IF NOT EXISTS rfid_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfid_number TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    condition TEXT,
    location TEXT,
    user_name TEXT,
    qty_washed INTEGER NOT NULL DEFAULT 0,
    washes_remaining INTEGER NOT NULL DEFAULT 0,
    assigned_location TEXT,
    date_assigned TIMESTAMP WITH TIME ZONE,
    date_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rfid_data_rfid_number ON rfid_data(rfid_number);
CREATE INDEX IF NOT EXISTS idx_rfid_data_category ON rfid_data(category);
CREATE INDEX IF NOT EXISTS idx_rfid_data_status ON rfid_data(status);
CREATE INDEX IF NOT EXISTS idx_rfid_data_created_at ON rfid_data(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_rfid_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rfid_data_updated_at ON rfid_data;
CREATE TRIGGER rfid_data_updated_at
    BEFORE UPDATE ON rfid_data
    FOR EACH ROW
    EXECUTE FUNCTION update_rfid_data_updated_at();
