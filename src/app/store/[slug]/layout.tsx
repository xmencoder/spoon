import { getRestaurantBySlug } from "@/lib/supabase/queries";
import { CartProvider } from "@/lib/store/CartContext";
import { notFound } from "next/navigation";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <CartProvider restaurantSlug={slug}>
      {children}
    </CartProvider>
  );
}
