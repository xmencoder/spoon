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
  /** Minimum baking / preparation lead time in hours before a delivery slot is valid. E.g. 2 = 2 hrs, 48 = 2 days. Null = default 1-hr lead time. */
  baking_period_hours?: number | null;
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
  popular_rank?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type OrderType = "delivery" | "takeaway";

export type PaymentStatus =
  | "unpaid"
  | "verification_pending"
  | "verified"
  | "not_received"
  | "refunded";

export type OrderStatus =
  | "payment_verification_pending"
  | "pending"
  | "confirmed"
  | "received_in_kitchen"
  | "baking"
  | "ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type ApprovalSource = "DASHBOARD" | "WHATSAPP";

export interface Order {
  id: string;
  order_number?: string | null;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  alternate_phone?: string | null;
  delivery_address: string | null;
  pickup_location?: string | null;
  order_type: OrderType;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method?: string | null;
  payment_status: PaymentStatus;
  payment_submitted_at?: string | null;
  payment_verified_at?: string | null;
  payment_verified_by?: string | null;
  approval_source?: ApprovalSource | string | null;
  payment_rejected_at?: string | null;
  payment_rejected_by?: string | null;
  rejection_source?: string | null;
  status: OrderStatus;
  delivery_slot_id?: string | null;
  delivery_date?: string | null;
  delivery_time_slot?: string | null;
  delivery_start_time?: string | null;
  delivery_end_time?: string | null;
  tracking_token: string;
  receipt_url?: string | null;
  receipt_generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  order_id: string;
  type: string;
  channel: "WHATSAPP" | "EMAIL" | "DASHBOARD" | "SMS";
  recipient: string;
  status: "sent" | "failed" | "queued";
  sent_at: string;
  provider_message_id?: string | null;
  error_message?: string | null;
}

export interface AuditLog {
  id: string;
  order_id?: string | null;
  action: string;
  admin_id?: string | null;
  source?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DeliverySlot {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm format (e.g., "10:00")
  end_time: string; // HH:mm format (e.g., "13:00")
  capacity: number;
  current_order_count: number;
  is_active: boolean;
  is_closed: boolean;
  closed_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  category?: Category | null;
}

export interface SlotTimeWindow {
  start_time: string;
  end_time: string;
  capacity: number;
}

export interface DeliverySlotTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  category_id?: string | null;
  slots: SlotTimeWindow[];
  created_at?: string;
  updated_at?: string;
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

export type BulkOrderStatus =
  | "new"
  | "contacted"
  | "in_discussion"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface BulkOrderEnquiry {
  id: string;
  enquiry_number?: string | null;
  restaurant_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  company_name?: string | null;
  occasion: string;
  estimated_quantity: string;
  target_date?: string | null;
  delivery_location?: string | null;
  budget_range?: string | null;
  product_interests?: string[] | null;
  dietary_preferences?: string[] | null;
  message?: string | null;
  status: BulkOrderStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
}
