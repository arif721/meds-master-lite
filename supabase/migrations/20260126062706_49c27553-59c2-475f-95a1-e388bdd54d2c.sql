-- Add active column to categories for soft delete
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;