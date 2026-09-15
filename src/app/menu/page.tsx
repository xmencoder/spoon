import { getDefaultRestaurant } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export default async function MenuPage() {
  const restaurant = await getDefaultRestaurant();
  const slug =
    restaurant?.slug ||
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  // Redirect to customer store route with full live Supabase menu, categories, and cart
  redirect(`/store/${slug}`);
}
