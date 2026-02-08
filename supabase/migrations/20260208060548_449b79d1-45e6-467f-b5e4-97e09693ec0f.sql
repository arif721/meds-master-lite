
-- 1. Add sale_date_time to invoices (custom sale date/time)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS sale_date_time TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing invoices to use created_at as sale_date_time
UPDATE public.invoices SET sale_date_time = created_at WHERE sale_date_time IS NULL;

-- Make customer_id nullable (Customer optional)
ALTER TABLE public.invoices ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Create samples table
CREATE TABLE public.samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_number TEXT NOT NULL,
  sale_date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  store_id UUID REFERENCES public.stores(id),
  customer_id UUID REFERENCES public.customers(id),
  seller_id UUID REFERENCES public.sellers(id),
  receiver_name TEXT,
  receiver_phone TEXT,
  total_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sample_lines table
CREATE TABLE public.sample_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  batch_id UUID REFERENCES public.batches(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  tp_rate NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage samples"
ON public.samples FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage sample_lines"
ON public.sample_lines FOR ALL
USING (true)
WITH CHECK (true);
