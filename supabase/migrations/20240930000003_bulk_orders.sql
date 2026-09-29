-- Migration: 20240930000003_bulk_orders.sql
-- Create table for Bulk Order & Gifting Enquiries

CREATE TABLE IF NOT EXISTS bulk_order_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number TEXT,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  company_name TEXT,
  occasion TEXT NOT NULL,
  estimated_quantity TEXT NOT NULL,
  target_date DATE,
  delivery_location TEXT,
  budget_range TEXT,
  product_interests JSONB DEFAULT '[]'::jsonb,
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy ordering & status filters
CREATE INDEX IF NOT EXISTS idx_bulk_order_enquiries_created_at
  ON bulk_order_enquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_order_enquiries_status
  ON bulk_order_enquiries (status);

-- Enable RLS
ALTER TABLE bulk_order_enquiries ENABLE ROW LEVEL SECURITY;

-- Allow public insert so customers can submit survey
CREATE POLICY "Allow public insert on bulk_order_enquiries"
  ON bulk_order_enquiries FOR INSERT
  WITH CHECK (true);

-- Allow public / admin select
CREATE POLICY "Allow read on bulk_order_enquiries"
  ON bulk_order_enquiries FOR SELECT
  USING (true);

-- Allow authenticated admins to update and delete
CREATE POLICY "Allow update for authenticated on bulk_order_enquiries"
  ON bulk_order_enquiries FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated on bulk_order_enquiries"
  ON bulk_order_enquiries FOR DELETE
  USING (true);
