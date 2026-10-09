-- ==============================================================================
-- MIGRATION: Add notification tracking for email idempotency
-- Run this in: Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Add payment fields to orders table if not already present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS approval_source TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create order_notifications table for idempotency + email tracking
CREATE TABLE IF NOT EXISTS public.order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Idempotency: prevent duplicate webhook processing
  razorpay_event_id TEXT UNIQUE,  -- X-Razorpay-Event-Id header or payment_id

  -- Email delivery tracking
  customer_email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (customer_email_status IN ('pending', 'sent', 'failed', 'skipped')),
  kitchen_email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kitchen_email_status IN ('pending', 'sent', 'failed', 'skipped')),

  -- Resend message IDs (populated once Resend accepts the message)
  customer_email_message_id TEXT,
  kitchen_email_message_id TEXT,

  -- Error tracking (sanitized — no secrets)
  customer_email_error TEXT,
  kitchen_email_error TEXT,

  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by order_id
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id
  ON public.order_notifications(order_id);

-- Index for idempotency lookup
CREATE INDEX IF NOT EXISTS idx_order_notifications_event_id
  ON public.order_notifications(razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;

-- 3. Enable RLS on notifications table
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

-- Service role (Edge Functions / server) can do everything — no customer access
-- The Edge Function uses service role key, so no explicit policy needed for server.
-- Restaurant owners can read notification status for their orders:
DROP POLICY IF EXISTS "Owners can view notifications for their orders" ON public.order_notifications;
CREATE POLICY "Owners can view notifications for their orders"
  ON public.order_notifications FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.restaurants r ON o.restaurant_id = r.id
      WHERE r.owner_id = auth.uid()
    )
  );

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_order_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_notifications_updated_at ON public.order_notifications;
CREATE TRIGGER set_order_notifications_updated_at
  BEFORE UPDATE ON public.order_notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_notifications_updated_at();

-- 5. Index on orders payment_status for admin queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token
  ON public.orders(tracking_token)
  WHERE tracking_token IS NOT NULL;
