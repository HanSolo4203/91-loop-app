-- Create quotations table
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0.00,
  vat_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  total_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotations_pkey PRIMARY KEY (id)
);

-- Create quotation_items table
CREATE TABLE public.quotation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL,
  linen_category_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  price_per_item numeric(10,2) NOT NULL DEFAULT 0.00,
  subtotal numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotation_items_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE
);

-- Create function to generate quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS text AS $$
DECLARE
  current_year text;
  sequence_number text;
  quotation_num text;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN quotation_number ~ ('^RSL-' || current_year || '-Q[0-9]+$')
      THEN CAST(SUBSTRING(quotation_number FROM 'Q([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_number
  FROM public.quotations;
  
  -- Format the quotation number
  quotation_num := 'RSL-' || current_year || '-Q' || LPAD(sequence_number::text, 3, '0');
  
  RETURN quotation_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate quotation number
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS trigger AS $$
BEGIN
  -- Only set quotation_number if it's not already provided
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := generate_quotation_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quotation number on insert
CREATE TRIGGER trigger_set_quotation_number
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_quotation_number();

-- Create indexes for better performance
CREATE INDEX idx_quotations_quotation_number ON public.quotations(quotation_number);
CREATE INDEX idx_quotations_created_at ON public.quotations(created_at);
CREATE INDEX idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);

-- Add RLS policies
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all quotations
CREATE POLICY "Allow authenticated users to read quotations" ON public.quotations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert quotations
CREATE POLICY "Allow authenticated users to insert quotations" ON public.quotations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update quotations
CREATE POLICY "Allow authenticated users to update quotations" ON public.quotations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete quotations
CREATE POLICY "Allow authenticated users to delete quotations" ON public.quotations
  FOR DELETE USING (auth.role() = 'authenticated');

-- Allow authenticated users to read all quotation items
CREATE POLICY "Allow authenticated users to read quotation items" ON public.quotation_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert quotation items
CREATE POLICY "Allow authenticated users to insert quotation items" ON public.quotation_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update quotation items
CREATE POLICY "Allow authenticated users to update quotation items" ON public.quotation_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete quotation items
CREATE POLICY "Allow authenticated users to delete quotation items" ON public.quotation_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE public.quotations IS 'Stores quotation headers with customer information and totals';
COMMENT ON COLUMN public.quotations.quotation_number IS 'Auto-generated unique quotation number in format RSL-YYYY-QXXX';
COMMENT ON TABLE public.quotation_items IS 'Stores individual items within a quotation';
COMMENT ON FUNCTION generate_quotation_number() IS 'Generates unique quotation numbers in format RSL-YYYY-QXXX';
