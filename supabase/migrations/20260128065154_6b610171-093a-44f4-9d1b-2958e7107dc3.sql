-- Add tp_rate column to products table (buying/trade price)
-- Current cost_price will be used as internal accounting cost
-- sales_price is MRP

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tp_rate numeric NOT NULL DEFAULT 0;

-- Copy existing cost_price to tp_rate as initial value (they can be same initially)
UPDATE public.products SET tp_rate = cost_price WHERE tp_rate = 0;

-- Add comment for clarity
COMMENT ON COLUMN public.products.cost_price IS 'Internal accounting cost for P&L calculation';
COMMENT ON COLUMN public.products.tp_rate IS 'Trade Price / Buying rate from supplier';
COMMENT ON COLUMN public.products.sales_price IS 'MRP - Maximum Retail Price';