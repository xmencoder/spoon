export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  whatsapp_number: string;
  phone: string | null;
  address: string | null;
  delivery_enabled: boolean;
  takeaway_enabled: boolean;
  delivery_charge: number;
  minimum_order: number;
  is_open: boolean;
  opening_hours?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  image_url?: string | null;
  category_limit?: number | null;
  created_at?: string;
}

export interface ProductSizeOption {
  id: string;
  label: string;
  price?: number;
  isDefault?: boolean;
}

export interface ProductAddonOption {
  id: string;
  label: string;
  price: number;
  icon?: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  sort_order: number;
  badge?: string | null;
  order_limit?: number | null;
  total_ordered?: number | null;
  sizes?: ProductSizeOption[] | null;
  addons?: ProductAddonOption[] | null;
  tags?: string[] | null;
  allergen_info?: string[] | null;
  storage_care?: string[] | null;
  gallery_images?: string[] | null;
  is_veg?: boolean | null;
  story_text?: string | null;
  rating?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type OrderType = "delivery" | "takeaway";
export type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "completed" | "cancelled";

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  order_type: OrderType;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: OrderStatus;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Profile {
  id: string;
  email: string;
  role: "admin" | "customer";
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
