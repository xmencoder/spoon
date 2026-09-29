-- ==============================================================================
-- THE INDULGENT SPOON — COMPLETE DATABASE SCHEMA UPDATE
-- Copy and run this script in Supabase Dashboard > SQL Editor > Click "Run"
-- ==============================================================================

-- 1. FIX ORDERS STATUS CHECK CONSTRAINT
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

-- 2. FIX ORDERS PAYMENT STATUS CHECK CONSTRAINT
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

-- 3. ENSURE ALL COLUMNS EXIST ON ORDERS TABLE
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
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_slot_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time_slot TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_start_time TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_end_time TEXT;

-- 4. CREATE ORDER SEQUENCE & INDEXES
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 5. ORDER STATUS HISTORY TABLE
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

-- 6. NOTIFICATION LOGS TABLE
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

-- 7. AUDIT LOGS TABLE
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

-- 8. RLS POLICIES FOR SECURE ACCESS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public to create orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Allow public to view orders by tracking token / ID
DROP POLICY IF EXISTS "Public can view order by tracking or id" ON public.orders;
CREATE POLICY "Public can view order by tracking or id"
  ON public.orders FOR SELECT
  USING (true);

-- Allow authenticated users (owners/admins) full access to orders
DROP POLICY IF EXISTS "Owners can view own restaurant orders" ON public.orders;
CREATE POLICY "Owners can view own restaurant orders"
  ON public.orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Owners can update own restaurant orders" ON public.orders;
CREATE POLICY "Owners can update own restaurant orders"
  ON public.orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

-- Order status history RLS
DROP POLICY IF EXISTS "Public can view status history" ON public.order_status_history;
CREATE POLICY "Public can view status history"
  ON public.order_status_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can insert status history" ON public.order_status_history;
CREATE POLICY "Public can insert status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage status history" ON public.order_status_history;
CREATE POLICY "Admins can manage status history"
  ON public.order_status_history FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Notification logs RLS
DROP POLICY IF EXISTS "Admins can manage notification logs" ON public.notification_logs;
CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can insert notification logs" ON public.notification_logs;
CREATE POLICY "Public can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Audit logs RLS
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.audit_logs;
CREATE POLICY "Admins can manage audit logs"
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_logs;
CREATE POLICY "Public can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
