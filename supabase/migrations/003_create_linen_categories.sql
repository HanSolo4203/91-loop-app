-- Create linen_categories table
CREATE TABLE IF NOT EXISTS public.linen_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    price_per_item NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for linen_categories
CREATE TRIGGER update_linen_categories_updated_at 
    BEFORE UPDATE ON public.linen_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial linen categories based on the mock data
INSERT INTO public.linen_categories (name, price_per_item) VALUES
('BATH TOWELS', 2.50),
('HAND TOWELS', 1.25),
('FACE TOWELS', 0.75),
('SINGLE FITTED SHEET', 3.00),
('KING FITTED SHEET', 4.50),
('SINGLE DUVET COVER', 4.00),
('KING DUVET COVER', 6.00),
('DUVET INNER SINGLE', 5.00),
('DUVET INNER KING', 7.50),
('SMALL PILLOWS', 2.00),
('SMALL PILLOW CASES', 1.50),
('PILLOW PROTECTORS', 1.00),
('MATT PROTECTORS (K)', 3.50),
('MATT PROTECTORS (S)', 2.50),
('WATERPROOF MATTRESS PROTECTOR', 4.00),
('SHOWER MATS', 1.75),
('SINGLE FLEECE', 2.25),
('DOUBLE FLEECE', 3.25)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.linen_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (you may need to adjust this based on your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON public.linen_categories
    FOR ALL USING (true);
