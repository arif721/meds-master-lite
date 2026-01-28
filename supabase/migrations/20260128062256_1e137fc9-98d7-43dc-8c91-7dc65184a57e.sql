-- Step 1: Create discount type enum
CREATE TYPE public.discount_type AS ENUM ('AMOUNT', 'PERCENT');

-- Step 2: Update products table
-- Rename sales_price to mrp and cost_price to tp_rate for clarity
-- Add comments to clarify the purpose
COMMENT ON COLUMN public.products.sales_price IS 'MRP - Maximum Retail Price (selling price base)';
COMMENT ON COLUMN public.products.cost_price IS 'TP Rate - Trade Price (buying rate per unit)';

-- Step 3: Update invoice_lines table
-- Add tp_rate to store the TP at time of sale
ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS tp_rate numeric NOT NULL DEFAULT 0;

-- Add discount fields
ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS discount_type public.discount_type NOT NULL DEFAULT 'AMOUNT';

ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;

-- Add mrp column to store the MRP at time of sale (rename unit_price conceptually)
COMMENT ON COLUMN public.invoice_lines.unit_price IS 'MRP at time of sale';
COMMENT ON COLUMN public.invoice_lines.cost_price IS 'TP Rate at time of sale (legacy, use tp_rate)';
COMMENT ON COLUMN public.invoice_lines.tp_rate IS 'TP Rate - Trade Price at time of sale';

-- Step 4: Update quotation_lines table with similar fields
ALTER TABLE public.quotation_lines 
ADD COLUMN IF NOT EXISTS tp_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.quotation_lines 
ADD COLUMN IF NOT EXISTS mrp numeric NOT NULL DEFAULT 0;

ALTER TABLE public.quotation_lines 
ADD COLUMN IF NOT EXISTS discount_type public.discount_type NOT NULL DEFAULT 'AMOUNT';

ALTER TABLE public.quotation_lines 
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;

-- Step 5: Add overall discount fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS discount_type public.discount_type NOT NULL DEFAULT 'AMOUNT';

-- Step 6: Add overall discount fields to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS discount_type public.discount_type NOT NULL DEFAULT 'AMOUNT';

-- Step 7: Migrate existing data - set tp_rate from cost_price in invoice_lines
UPDATE public.invoice_lines SET tp_rate = cost_price WHERE tp_rate = 0 AND cost_price > 0;

-- Step 8: Migrate existing data - set tp_rate and mrp in quotation_lines
UPDATE public.quotation_lines SET mrp = unit_price WHERE mrp = 0 AND unit_price > 0;