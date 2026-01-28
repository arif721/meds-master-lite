-- Add soft delete fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to batches table (inventory)
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Add soft delete fields to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_stores_is_deleted ON public.stores(is_deleted);
CREATE INDEX IF NOT EXISTS idx_invoices_is_deleted ON public.invoices(is_deleted);
CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON public.payments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_batches_is_deleted ON public.batches(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sellers_is_deleted ON public.sellers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON public.categories(is_deleted);