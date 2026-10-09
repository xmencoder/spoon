import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-only operations.
 * Bypasses RLS to reliably handle Razorpay webhooks, idempotency tracking,
 * and background order notification delivery without depending on active user session cookies.
 *
 * NEVER expose this to client components or the browser!
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
