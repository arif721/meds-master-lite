
-- Create sample status enum
CREATE TYPE public.sample_status AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- Add status column to samples table
ALTER TABLE public.samples ADD COLUMN status public.sample_status NOT NULL DEFAULT 'CONFIRMED';

-- Update existing samples to CONFIRMED
UPDATE public.samples SET status = 'CONFIRMED' WHERE status IS NOT NULL;
