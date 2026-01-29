-- Add customer_code column to stores table
ALTER TABLE public.stores ADD COLUMN customer_code TEXT UNIQUE;

-- Create a function to generate next customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Get the max number from existing codes
  SELECT COALESCE(MAX(
    CASE 
      WHEN customer_code ~ '^GL-[0-9]+$' 
      THEN CAST(SUBSTRING(customer_code FROM 4) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_number
  FROM public.stores;
  
  -- Format with leading zeros (4 digits)
  new_code := 'GL-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate customer_code on insert
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := public.generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_customer_code
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_code();

-- Update existing stores with customer codes
UPDATE public.stores 
SET customer_code = 'GL-' || LPAD(ROW_NUMBER::TEXT, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as ROW_NUMBER
  FROM public.stores
  WHERE customer_code IS NULL
) numbered
WHERE stores.id = numbered.id;