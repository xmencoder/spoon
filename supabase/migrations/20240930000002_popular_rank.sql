-- Add popular_rank to products table
-- Admin can set this to control display order in the "Popular" category on the home page.
-- NULL means not featured / not in popular. A positive integer (1,2,3...) sets the rank.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS popular_rank integer DEFAULT NULL;

-- Index for fast ordering on the home page popular section
CREATE INDEX IF NOT EXISTS idx_products_popular_rank
  ON products (restaurant_id, popular_rank)
  WHERE popular_rank IS NOT NULL;
