-- Create payment_terms enum
CREATE TYPE public.payment_terms AS ENUM ('CASH', '7_DAYS', '15_DAYS', '21_DAYS', '30_DAYS');

-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  payment_terms public.payment_terms NOT NULL DEFAULT 'CASH',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Authenticated users can manage stores"
ON public.stores
FOR ALL
USING (true)
WITH CHECK (true);

-- Add store_id to invoices table
ALTER TABLE public.invoices 
ADD COLUMN store_id UUID REFERENCES public.stores(id);

-- Add store_id to quotations table  
ALTER TABLE public.quotations
ADD COLUMN store_id UUID REFERENCES public.stores(id);

-- Create index for better performance
CREATE INDEX idx_stores_name ON public.stores(name);
CREATE INDEX idx_stores_active ON public.stores(active);
CREATE INDEX idx_invoices_store_id ON public.invoices(store_id);

-- Add trigger for updated_at
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();