-- ==============================================================================
-- THE INDULGENT SPOON — SEED DATA (ARTISANAL BAKERY CATALOG)
-- ==============================================================================

DO $$
DECLARE
  v_owner_id UUID;
  v_restaurant_id UUID;
  v_cat_popular UUID;
  v_cat_teacake UUID;
  v_cat_muffins UUID;
  v_cat_sourdough UUID;
  v_cat_spreads UUID;
  v_cat_sugarfree UUID;
  v_cat_cakejars UUID;
  v_cat_giftboxes UUID;
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
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80',
    'Artisanal bakery crafted with real European butter, pure Belgian chocolate, and honest ingredients. Freshly baked and delivered to your doorstep.',
    '+919876543210',
    '+919876543210',
    'Sector 14, Rewari, Haryana',
    true,
    true,
    0.00,
    150.00,
    true,
    '10:00 AM – 10:00 PM Daily'
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    whatsapp_number = EXCLUDED.whatsapp_number,
    delivery_charge = EXCLUDED.delivery_charge
  RETURNING id INTO v_restaurant_id;

  -- 4. Clean previous seed categories/products for this restaurant
  DELETE FROM public.products WHERE restaurant_id = v_restaurant_id;
  DELETE FROM public.categories WHERE restaurant_id = v_restaurant_id;

  -- 5. Insert The 8 Official Bakery Categories
  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Popular', 1)
  RETURNING id INTO v_cat_popular;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Tea Cake', 2)
  RETURNING id INTO v_cat_teacake;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Muffins', 3)
  RETURNING id INTO v_cat_muffins;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Sourdough', 4)
  RETURNING id INTO v_cat_sourdough;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Spreads', 5)
  RETURNING id INTO v_cat_spreads;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Sugar Free', 6)
  RETURNING id INTO v_cat_sugarfree;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Cake Jars', 7)
  RETURNING id INTO v_cat_cakejars;

  INSERT INTO public.categories (restaurant_id, name, sort_order)
  VALUES (v_restaurant_id, 'Gift Boxes', 8)
  RETURNING id INTO v_cat_giftboxes;

  -- 6. Insert All Real Bakery Products with Sizes, Add-ons, Badges & Allergen info

  -- --------------------------------------------------------------------------
  -- TEA CAKES
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    v_restaurant_id,
    v_cat_teacake,
    'OG Choco Chip Butter Cake',
    'Soft, buttery & loaded with choco chips. The Nanz Original.',
    900.00,
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
    true, true, 1,
    'BESTSELLER', true, 4.8,
    ARRAY['Bestseller', 'Classic', 'Eggless'],
    '[{"id":"size-350g","label":"350 gms","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Butter & Milk)', 'Soy Lecithin (in Chocolate)', '100% Eggless variant available'],
    ARRAY['Room Temperature: 3-4 days in airtight box', 'Refrigerate: up to 7 days', 'Warm 10s in microwave for molten core'],
    'Our OG Choco Chip Butter Cake is a timeless classic. Rich, moist, and buttery, it is generously packed with premium chocolate chips in every bite.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000002',
    v_restaurant_id,
    v_cat_teacake,
    'Intense Chocolate Butter Cake',
    'Soft, buttery & intensely chocolatey. Made for true chocoholics.',
    999.00,
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80',
    true, true, 2,
    'POPULAR', true, 4.9,
    ARRAY['Rich', 'Gooey', 'Chocolate Lover'],
    '[{"id":"size-350g","label":"350 gms","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Butter & Cream)', 'Soy Lecithin'],
    ARRAY['Room Temperature: 3-4 days in airtight tin', 'Warm for 12 seconds in microwave for molten bliss'],
    'Intensely dark, deeply fudgy, and packed with Belgian couverture cocoa. Every bite melts on your tongue with velvety smoothness.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000003',
    v_restaurant_id,
    v_cat_teacake,
    'Red Velvet Cream Cheese Cake',
    'Velvety scarlet crumb with luscious Madagascan cream cheese frosting.',
    950.00,
    'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=800&auto=format&fit=crop&q=80',
    true, false, 3,
    'BESTSELLER', true, 4.8,
    ARRAY['Velvet', 'Cream Cheese', 'Celebration'],
    '[{"id":"size-350g","label":"350 gms","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Cream Cheese & Butter)'],
    ARRAY['Refrigeration: Store in the fridge for up to 5 days', 'Serve chilled or rest 10 min at room temp'],
    'Our iconic Red Velvet is delicately tender with a hint of natural cocoa and cultured buttermilk.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000004',
    v_restaurant_id,
    v_cat_teacake,
    'Lemon Drizzle Cake',
    'A zesty classic soaked with Meyer lemon syrup for bright days.',
    799.00,
    'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80',
    true, false, 4,
    'NEW!', true, 4.7,
    ARRAY['Zesty', 'Light', 'Refreshing'],
    '[{"id":"size-350g","label":"350 gms","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Butter & Milk)'],
    ARRAY['Room temperature: 4 days in an airtight tin', 'Pair with hot Earl Grey or Darjeeling tea'],
    'Baked with freshly grated Meyer lemon zest and drenched in hot artisanal lemon sugar syrup.'
  );

  -- --------------------------------------------------------------------------
  -- MUFFINS
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000005',
    v_restaurant_id,
    v_cat_muffins,
    'Wild Blueberry Streusel Muffin',
    'Bursting with juicy wild blueberries and crowned with crispy brown sugar streusel.',
    500.00,
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80',
    true, true, 5,
    'BESTSELLER', true, 4.8,
    ARRAY['Pack of 4', 'Wild Berry', 'Crisp Top'],
    '[{"id":"pack-4","label":"Pack of 4","price":500,"isDefault":true},{"id":"pack-8","label":"Pack of 8","price":1000},{"id":"pack-12","label":"Pack of 12","price":1500}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candles","label":"Celebration Candles","price":40,"icon":"🕯️"},{"id":"gift-box","label":"Gift Box","price":40,"icon":"🎁"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Butter & Milk)'],
    ARRAY['Store at room temp in airtight container for up to 3 days', 'Warm in microwave for 10 seconds'],
    'Crafted with hand-picked wild blueberries and slow-baked for a super-tender golden crumb topped with a crisp cinnamon streusel crown.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000006',
    v_restaurant_id,
    v_cat_muffins,
    'Double Belgian Choco Muffin',
    'Rich dark chocolate muffin loaded with gooey Belgian chocolate molten drops.',
    500.00,
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    true, false, 6,
    'POPULAR', true, 4.9,
    ARRAY['Pack of 4', 'Molten Core', 'Belgian Choco'],
    '[{"id":"pack-4","label":"Pack of 4","price":500,"isDefault":true},{"id":"pack-8","label":"Pack of 8","price":1000},{"id":"pack-12","label":"Pack of 12","price":1500}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candles","label":"Celebration Candles","price":40,"icon":"🕯️"},{"id":"gift-box","label":"Gift Box","price":40,"icon":"🎁"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Butter & Milk)', 'Soy Lecithin'],
    ARRAY['Store at room temperature for 3 days', 'Microwave 12 seconds for molten lava drops'],
    'Loaded with double couverture Belgian cocoa and bursting with molten chocolate chips in every bite.'
  );

  -- --------------------------------------------------------------------------
  -- SOURDOUGH
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000007',
    v_restaurant_id,
    v_cat_sourdough,
    'Artisanal Country Sourdough',
    '36-hour slow fermented wild yeast sourdough with blistered caramel crust and open crumb.',
    290.00,
    'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80',
    true, true, 7,
    'BESTSELLER', true, 4.9,
    ARRAY['Wild Ferment', 'No Commercial Yeast', 'Vegan'],
    '[{"id":"loaf-500g","label":"Artisanal Loaf (500g)","isDefault":true}]'::jsonb,
    '[{"id":"wholewheat","label":"Wholewheat Upgrade","price":100,"icon":"🌾"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', '100% Naturally Vegan, zero dairy'],
    ARRAY['Keep cut-side down on wooden board for 2 days', 'Toast slices for 2-3 mins for optimal crunch'],
    'Naturally leavened with our decade-old sourdough starter. Fermented for 36 hours for rich depth of flavor and easy digestion.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000008',
    v_restaurant_id,
    v_cat_sourdough,
    'Kalamata Olive & Rosemary Sourdough',
    'Infused with organic Tuscan extra virgin olive oil, fragrant rosemary, and Greek Kalamata olives.',
    340.00,
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    true, false, 8,
    'NEW!', true, 4.8,
    ARRAY['Artisanal', 'Savory Herb', 'Handcrafted'],
    '[{"id":"loaf-500g","label":"Artisanal Loaf (500g)","isDefault":true}]'::jsonb,
    '[{"id":"wholewheat","label":"Wholewheat Upgrade","price":100,"icon":"🌾"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', '100% Naturally Vegan'],
    ARRAY['Store in bread bag for 3 days', 'Re-crisp in oven at 180C for 5 mins'],
    'Studded with plump Greek Kalamata olives and fresh garden rosemary, folded into our signature slow-fermented sourdough.'
  );

  -- --------------------------------------------------------------------------
  -- SPREADS
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000009',
    v_restaurant_id,
    v_cat_spreads,
    'Zero-Sugar Roasted Hazelnut Spread',
    'Pure stone-ground Turkish hazelnuts blended with raw cacao and monkfruit sweetener.',
    480.00,
    'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&auto=format&fit=crop&q=80',
    true, true, 9,
    'POPULAR', true, 4.9,
    ARRAY['Zero Sugar', '70% Hazelnuts', 'Keto Friendly'],
    '[{"id":"size-240g","label":"240 gm","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Tree Nuts (Hazelnuts)', 'Dairy (Milk Solids)', '100% Refined Sugar Free'],
    ARRAY['Store in cool dry place; oil separation is natural, stir before use', 'Do not refrigerate'],
    'Stone-ground in small batches with 70% slow-roasted Turkish hazelnuts, organic cocoa butter, and plant-based monkfruit.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000010',
    v_restaurant_id,
    v_cat_spreads,
    'Artisanal Fleur de Sel Caramel',
    'Slow-caramelized dairy cream simmered with Madagascar vanilla and mineral-rich sea salt.',
    390.00,
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
    true, false, 10,
    'NEW!', true, 4.8,
    ARRAY['Slow Simmered', 'Vanilla Bean', 'Luscious'],
    '[{"id":"size-240g","label":"240 gm","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Dairy (Butter & Fresh Cream)', '100% Vegetarian recipe'],
    ARRAY['Store at room temp or fridge for 4 weeks', 'Warm slightly to loosen texture for drizzling'],
    'Slow-simmered pure butter and heavy dairy cream kissed with Madagascan Bourbon vanilla and hand-harvested Fleur de Sel salt.'
  );

  -- --------------------------------------------------------------------------
  -- SUGAR FREE
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000011',
    v_restaurant_id,
    v_cat_sugarfree,
    'Sugar-Free Almond Flour Brownie',
    'Dense, fudgy brownie sweetened naturally with stevia extract & California almond flour.',
    320.00,
    'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&auto=format&fit=crop&q=80',
    true, true, 11,
    'POPULAR', true, 4.8,
    ARRAY['Zero Sugar', 'Gluten Conscious', 'Fudgy'],
    '[{"id":"single","label":"Single Slice (120g)","isDefault":true},{"id":"box-4","label":"Box of 4","price":1200}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"}]'::jsonb,
    ARRAY['Contains Tree Nuts (Almonds)', 'Dairy (Butter)', 'Zero Refined Sugar'],
    ARRAY['Keep in airtight box for 5 days', 'Microwave 10s for fudgy center'],
    'Rich, dense brownie crafted with 100% fine almond flour and dark cocoa. Naturally sweetened for zero blood sugar spike.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000012',
    v_restaurant_id,
    v_cat_sugarfree,
    'Sugar-Free Basque Burnt Cheesecake',
    'Caramelized charred exterior with a molten creamy center, 100% refined sugar-free.',
    420.00,
    'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80',
    true, false, 12,
    'NEW!', true, 4.9,
    ARRAY['Zero Sugar', 'Keto', 'Rich & Creamy'],
    '[{"id":"slice","label":"Portion Slice (180g)","isDefault":true}]'::jsonb,
    '[{"id":"message-card","label":"Message Card","price":20,"icon":"💌"}]'::jsonb,
    ARRAY['Contains Dairy (Philadelphia Cream Cheese & Fresh Cream)', 'Zero Refined Sugar'],
    ARRAY['Keep refrigerated at all times (5 days)', 'Enjoy cold directly from fridge'],
    'Our classic Basque burnt cheesecake made keto-friendly and sugar-free with pure monkfruit.'
  );

  -- --------------------------------------------------------------------------
  -- CAKE JARS
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000013',
    v_restaurant_id,
    v_cat_cakejars,
    'Belgian Truffle Cake Jar',
    'Layers of moist dark chocolate sponge and rich 55% Belgian chocolate ganache.',
    280.00,
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
    true, true, 13,
    'BESTSELLER', true, 4.9,
    ARRAY['Portable Delight', 'Triple Layer', 'Rich Truffle'],
    '[{"id":"single-jar","label":"Glass Jar (200ml)","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"candle","label":"Celebration Candle","price":40,"icon":"🕯️"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Cream & Butter)', 'Soy Lecithin'],
    ARRAY['Refrigerate up to 7 days', 'Pro tip: Microwave for 10s for warm lava jar experience!'],
    'Generously layered in an artisanal glass jar with fluffy dark cocoa sponge and smothered with velvety Belgian chocolate truffle ganache.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000014',
    v_restaurant_id,
    v_cat_cakejars,
    'Lotus Biscoff Mousse Cake Jar',
    'Fluffy vanilla sponge layered with Lotus spread, white chocolate mousse, and spiced cookie crumble.',
    320.00,
    'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80',
    true, false, 14,
    'POPULAR', true, 4.8,
    ARRAY['Biscoff Lover', 'Creamy Mousse', 'Crunchy'],
    '[{"id":"single-jar","label":"Glass Jar (200ml)","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (Cream & White Chocolate)', 'Soy (in Biscoff)'],
    ARRAY['Keep refrigerated up to 5 days', 'Serve chilled'],
    'Speculoos cookie lovers rejoice: velvet vanilla sponge, caramelized Lotus Biscoff spread, and velvety whipped mousse.'
  );

  -- --------------------------------------------------------------------------
  -- GIFT BOXES
  -- --------------------------------------------------------------------------
  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000015',
    v_restaurant_id,
    v_cat_giftboxes,
    'Assorted Cookie Tin',
    '3-in-1 collectible tin: OG Choco Chip • Red Velvet • Double Choco Chip.',
    699.00,
    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    true, true, 15,
    'BESTSELLER', true, 4.9,
    ARRAY['Assorted', 'Perfect Gift', 'Freshly Baked'],
    '[{"id":"tin-12","label":"Collectible Tin (12 Cookies)","isDefault":true}]'::jsonb,
    '[{"id":"birthday","label":"Birthday Tag","price":40,"icon":"🎂"},{"id":"message-card","label":"Message Card","price":20,"icon":"💌"},{"id":"ribbon","label":"Luxury Satin Ribbon","price":30,"icon":"🎀"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy (European Butter)', 'Soy', '100% Eggless cookies'],
    ARRAY['Airtight tin keeps cookies crisp for up to 3 weeks', 'Store away from direct sunlight'],
    'Handcrafted butter cookies baked golden in small batches. Packed in an antique keepsake vintage tin that seals in oven freshness.'
  );

  INSERT INTO public.products (
    id, restaurant_id, category_id, name, description, price, image_url, available, featured, sort_order,
    badge, is_veg, rating, tags, sizes, addons, allergen_info, storage_care, story_text
  ) VALUES (
    'a0000000-0000-0000-0000-000000000016',
    v_restaurant_id,
    v_cat_giftboxes,
    'The Indulgent Luxe Gift Hamper',
    'Curated luxury box with assorted cookies, Belgian brownies, artisanal spread, and celebration note.',
    1850.00,
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
    true, true, 16,
    'BESTSELLER', true, 5.0,
    ARRAY['Luxe Box', 'Hand-Tied', 'Custom Note'],
    '[{"id":"hamper-standard","label":"Luxury Hamper Box","isDefault":true}]'::jsonb,
    '[{"id":"message-card","label":"Handwritten Calligraphy Card","price":20,"icon":"💌"}]'::jsonb,
    ARRAY['Contains Wheat (Gluten)', 'Dairy', 'Nuts (Hazelnuts & Almonds)'],
    ARRAY['Best enjoyed within 10 days of delivery', 'Store in a cool place'],
    'The ultimate gifting experience from The Indulgent Spoon. Handcrafted, beautifully boxed, and guaranteed to spark pure delight.'
  );

END $$;
