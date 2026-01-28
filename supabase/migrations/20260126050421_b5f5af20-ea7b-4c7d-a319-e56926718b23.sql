-- Add cost_price column to invoice_lines to track COGS at time of sale
-- This stores the batch cost_price when the line was created, for accurate profit calculation

ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;

-- Add free_quantity column to track free/promotional items (reduces inventory but has 0 sales value)
ALTER TABLE public.invoice_lines 
ADD COLUMN IF NOT EXISTS free_quantity integer NOT NULL DEFAULT 0;

-- Add invoice_id to stock_adjustments to link returns to specific invoices
ALTER TABLE public.stock_adjustments 
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Add return_action column for returns (RESTOCK or SCRAP)
ALTER TABLE public.stock_adjustments 
ADD COLUMN IF NOT EXISTS return_action public.return_action;

-- Add return_value to track the value of returned items
ALTER TABLE public.stock_adjustments 
ADD COLUMN IF NOT EXISTS return_value numeric DEFAULT 0;

-- Create index for faster P&L queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON public.invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON public.invoice_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON public.stock_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_type ON public.stock_adjustments(type);