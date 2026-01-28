-- Add FREE type to stock_ledger_type enum for tracking free giveaways separately
ALTER TYPE public.stock_ledger_type ADD VALUE IF NOT EXISTS 'FREE';