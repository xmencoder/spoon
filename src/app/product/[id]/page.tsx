import { getDefaultRestaurant } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DirectProductPage({ params }: Props) {
  const { id } = await params;
  const restaurant = await getDefaultRestaurant();
  const slug =
    restaurant?.slug ||
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  redirect(`/store/${slug}/product/${id}`);
}
