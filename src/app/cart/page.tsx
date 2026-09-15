import { getDefaultRestaurant } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export default async function CartPage() {
  const restaurant = await getDefaultRestaurant();
  const slug =
    restaurant?.slug ||
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  // Redirect to active customer cart route
  redirect(`/store/${slug}/cart`);
}
