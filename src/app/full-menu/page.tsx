import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MenuSection } from "@/components/home/MenuSection";
import { getDefaultRestaurant, getCategories, getProducts } from "@/lib/supabase/queries";

export const metadata = {
  title: "Full Menu | The Indulgent Spoon",
  description:
    "Browse our complete artisanal bakery menu — cakes, sourdough, muffins, cookies, spreads, and zero-sugar treats handcrafted daily.",
};

export default async function FullMenuPage() {
  const slug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || "the-indulgent-spoon";

  const restaurant = await getDefaultRestaurant();
  const categories = restaurant ? await getCategories(restaurant.id) : [];
  const products = restaurant ? await getProducts(restaurant.id) : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header />

      <main className="flex-1">
        {/* ═══ FULL MENU WITH SCROLL-SPY CATEGORY NAVIGATION ═══ */}
        <MenuSection
          slug={slug}
          isFullMenu={true}
          initialRestaurantId={restaurant?.id}
          initialCategories={categories}
          initialProducts={products}
        />
      </main>

      <Footer />
    </div>
  );
}
