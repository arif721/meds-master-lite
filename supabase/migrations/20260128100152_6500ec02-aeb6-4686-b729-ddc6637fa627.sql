-- Add designation column to sellers table for representative title/position
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS designation text DEFAULT NULL;
