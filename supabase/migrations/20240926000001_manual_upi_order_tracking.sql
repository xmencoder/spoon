-- ==============================================================================
-- MANUAL UPI PAYMENT, ADMIN VERIFICATION, ORDER TRACKING & AUDIT LOGS
-- ==============================================================================

-- 1. ORDER SEQUENCE FOR CLEAN READABLE ORDER NUMBERS (#1024, #1025...)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- 2. EXTEND ORDERS TABLE WITH PAYMENT, TRACKING & RECEIPT METADATA
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_location TEXT DEFAULT 'The Indulgent Spoon, DLF Phase 4, Gurugram';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approval_source TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejected_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejection_source TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_generated_at TIMESTAMPTZ;

-- Drop old CHECK constraint on status if exists and apply modern comprehensive status constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'payment_verification_pending',
    'pending',
    'confirmed',
    'received_in_kitchen',
    'baking',
    'ready',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'completed',
    'cancelled'
  )
);

-- Payment status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (
  payment_status IN (
    'unpaid',
    'verification_pending',
    'verified',
    'not_received',
    'refunded'
  )
);

-- Index on tracking_token for lightning fast tracking lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 3. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by TEXT DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at ASC);

-- 4. NOTIFICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL', 'DASHBOARD', 'SMS')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON public.notification_logs(order_id);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  admin_id TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_order_id ON public.audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 6. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of status history for customer tracking
CREATE POLICY "Public can view status history"
  ON public.order_status_history FOR SELECT
  USING (true);

-- Allow authenticated admins full access to status history
CREATE POLICY "Admins can manage status history"
  ON public.order_status_history FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Notification logs policies
CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Admins can manage audit logs"
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Ensure public can read order by tracking token or id for customer tracking page
DROP POLICY IF EXISTS "Public can view order by tracking or id" ON public.orders;
CREATE POLICY "Public can view order by tracking or id"
  ON public.orders FOR SELECT
  USING (true);
