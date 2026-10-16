import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MenuSection } from "@/components/home/MenuSection";
import { getDefaultRestaurant, getCategories, getProducts } from "@/lib/supabase/queries";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Full Bakery Menu — Cakes, Sourdough & Desserts",
  description:
    "Browse our complete artisanal bakery menu — handcrafted cakes, sourdough loaves, muffins, cookies, spreads, and zero-sugar treats delivered across Delhi NCR.",
  alternates: {
    canonical: "/full-menu",
  },
  openGraph: {
    title: "Full Bakery Menu — Cakes, Sourdough & Desserts | The Indulgent Spoon",
    description:
      "Browse our complete artisanal bakery menu — handcrafted cakes, sourdough loaves, muffins, cookies, spreads, and zero-sugar treats delivered across Delhi NCR.",
    url: "https://theindulgentspoon.in/full-menu",
    images: [
      {
        url: "/main_photo_f.jpeg",
        width: 1200,
        height: 630,
        alt: "The Indulgent Spoon Bakery Menu",
      },
    ],
  },
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
