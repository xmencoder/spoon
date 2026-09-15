-- ==============================================================================
-- THE INDULGENT SPOON — SEED DATA
-- ==============================================================================

DO $$
DECLARE
  v_owner_id UUID;
  v_restaurant_id UUID;
  v_cat_bestsellers UUID;
  v_cat_starters UUID;
  v_cat_main UUID;
  v_cat_biryani UUID;
  v_cat_bakery UUID;
  v_cat_desserts UUID;
  v_cat_drinks UUID;
BEGIN
  -- 1. Check or assign demo owner id
  SELECT id INTO v_owner_id FROM auth.users LIMIT 1;

  -- 2. Ensure profile exists for demo owner if an auth user exists
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (v_owner_id, 'admin@theindulgentspoon.com', 'admin')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  END IF;

  -- 3. Upsert The Indulgent Spoon restaurant
  INSERT INTO public.restaurants (
    owner_id,
    name,
    slug,
    logo_url,
    description,
    whatsapp_number,
    phone,
    address,
    delivery_enabled,
    takeaway_enabled,
    delivery_charge,
    minimum_order,
    is_open,
    opening_hours
  )
  VALUES (
    v_owner_id,
    'The Indulgent Spoon',
    'the-indulgent-spoon',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
    'Curated artisanal recipes cooked with fresh wholesome ingredients. Artisanal cloud kitchen & bakery delivered straight to your doorstep via WhatsApp.',
    '+919876543210',
    '+919876543210',
    'Sector 14, Rewari, Haryana',
    true,
    true,
    40.00,
    150.00,
    true,
    '11:00 AM – 11:00 PM Daily'
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    whatsapp_number = EXCLUDED.whatsapp_number,
    delivery_charge = EXCLUDED.delivery_charge
  RETURNING id INTO v_restaurant_id;

  -- 4. Clean previous seed categories/products for this restaurant
  DELETE FROM public.categories WHERE restaurant_id = v_restaurant_id;

  -- 5. Insert Categories
  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Bestsellers', 1)
  RETURNING id INTO v_cat_bestsellers;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Starters', 2)
  RETURNING id INTO v_cat_starters;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Main Course', 3)
  RETURNING id INTO v_cat_main;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Biryani', 4)
  RETURNING id INTO v_cat_biryani;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Artisanal Bakery', 5)
  RETURNING id INTO v_cat_bakery;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Desserts', 6)
  RETURNING id INTO v_cat_desserts;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Beverages', 7)
  RETURNING id INTO v_cat_drinks;

  -- 6. Insert Products

  -- Biryani & Bestseller
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_biryani,
    'Royal Chicken Dum Biryani',
    'Fragrant 2-year aged basmati layered with succulent farm chicken, caramel brown onions, saffron threads, and pot-sealed on low dum.',
    349.00,
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    1
  );

  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_biryani,
    'Nawabi Veg Dum Biryani',
    'Seasonal garden vegetables, golden fried cottage cheese, whole aromatics, and mint steeped in royal basmati.',
    289.00,
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
    true,
    false,
    2
  );

  -- Starters
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_starters,
    'Smoked Paneer Tikka',
    'Hand-pressed artisanal cottage cheese steeped in Kashmiri red chilli, cold-pressed mustard oil, hung curd, and roasted over natural charcoal.',
    289.00,
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    3
  );

  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_starters,
    'Murgh Malai Tikka',
    'Boneless chicken cubes marinated in creamy cheese, cashew paste, cardamom, and roasted tender in clay oven.',
    329.00,
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
    true,
    false,
    4
  );

  -- Main Course
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_main,
    'Old Delhi Butter Chicken',
    'Charcoal roasted tandoori chicken simmered slowly in a rich velvet satin makhani sauce infused with fresh butter and sun-dried fenugreek.',
    389.00,
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    5
  );

  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_main,
    'Dal Makhani Royal',
    'Slow-cooked black lentils simmered overnight over live charcoal embers with butter, cream, and ginger juliennes.',
    269.00,
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
    true,
    false,
    6
  );

  -- Bakery
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_bakery,
    'Artisanal Butter Croissant',
    'Folded with 72 gossamer layers of pure cultured European butter. Hand-laminated, slow-proofed, and baked golden every sunrise.',
    169.00,
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    7
  );

  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_bakery,
    'Sourdough Country Loaf',
    'Naturally fermented with 36-hour wild yeast starter, dark blistered crust, and open airy crumb.',
    199.00,
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    true,
    false,
    8
  );

  -- Desserts
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_desserts,
    'Belgium Truffle Brownie',
    'Dense, molten center crafted from 70% single-origin Belgian dark chocolate, topped with house-made salted caramel and toasted pecans.',
    199.00,
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    9
  );

  -- Beverages
  INSERT INTO public.products (
    restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order
  ) VALUES (
    v_restaurant_id,
    v_cat_drinks,
    'Signature Cold Brew Coffee',
    'Single-estate Arabica beans coarse-ground and slow-steeped for 18 hours in cold filtered spring water. Poured over ice with whole milk.',
    159.00,
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    10
  );

END $$;
