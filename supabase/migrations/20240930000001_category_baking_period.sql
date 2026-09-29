-- ==============================================================================
-- Add baking_period_hours column to categories table
-- This controls how many hours in advance a customer must order
-- (delivery slots are hidden until baking_period_hours from now)
-- Run this in Supabase Dashboard > SQL Editor > Run
-- ==============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS baking_period_hours NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN public.categories.baking_period_hours IS
  'Minimum lead time in hours required for this category. E.g. 2 = 2 hours, 48 = 2 days. NULL means no extra lead time (uses default 60 min).';
