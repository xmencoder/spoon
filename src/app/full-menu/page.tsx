import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MenuSection } from "@/components/home/MenuSection";

export const metadata = {
  title: "Full Menu | The Indulgent Spoon",
  description:
    "Browse our complete artisanal bakery menu — cakes, sourdough, muffins, cookies, spreads, and zero-sugar treats handcrafted daily.",
};

export default function FullMenuPage() {
  const slug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || "the-indulgent-spoon";

  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header />

      <main className="flex-1">
        {/* ═══ FULL MENU WITH SCROLL-SPY CATEGORY NAVIGATION ═══ */}
        <MenuSection slug={slug} isFullMenu={true} />
      </main>

      <Footer />
    </div>
  );
}
