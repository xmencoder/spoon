-- ==============================================================================
-- DELIVERY DATE & TIME SLOT MANAGEMENT SYSTEM
-- ==============================================================================

-- 1. DELIVERY SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity >= 0),
  current_order_count INTEGER NOT NULL DEFAULT 0 CHECK (current_order_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index and unique constraint for fast lookup and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_delivery_slots_restaurant_date 
  ON public.delivery_slots(restaurant_id, date);

CREATE INDEX IF NOT EXISTS idx_delivery_slots_category 
  ON public.delivery_slots(category_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_slots_key
  ON public.delivery_slots(restaurant_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), date, start_time, end_time);

-- 2. DELIVERY SLOT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.delivery_slot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_slot_templates_restaurant 
  ON public.delivery_slot_templates(restaurant_id);

-- 3. ENHANCE ORDERS TABLE WITH DELIVERY SNAPSHOT FIELDS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_slot_id UUID REFERENCES public.delivery_slots(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time_slot TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_start_time TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_end_time TEXT;

-- 4. ATOMIC CAPACITY INCREMENT FUNCTION
CREATE OR REPLACE FUNCTION public.reserve_delivery_slot(p_slot_id UUID, p_qty INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  SELECT * INTO v_slot
  FROM public.delivery_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF v_slot.is_closed THEN
    RETURN jsonb_build_object('success', false, 'error', 'This delivery slot is marked as closed');
  END IF;

  IF NOT v_slot.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'This delivery slot is inactive');
  END IF;

  IF (v_slot.current_order_count + p_qty) > v_slot.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'This delivery slot is fully booked');
  END IF;

  UPDATE public.delivery_slots
  SET current_order_count = current_order_count + p_qty,
      updated_at = NOW()
  WHERE id = p_slot_id;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'new_count', v_slot.current_order_count + p_qty,
    'capacity', v_slot.capacity
  );
END;
$$;

-- 5. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slot_templates ENABLE ROW LEVEL SECURITY;

-- Public can read active delivery slots
CREATE POLICY "Public can view delivery slots"
  ON public.delivery_slots FOR SELECT
  USING (true);

-- Authenticated users (admin) can manage delivery slots
CREATE POLICY "Admins can manage delivery slots"
  ON public.delivery_slots FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Public can view templates if needed / Admin can manage
CREATE POLICY "Public can view templates"
  ON public.delivery_slot_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.delivery_slot_templates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
