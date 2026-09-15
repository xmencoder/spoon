import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Plus,
  Clock,
  Star,
  Award,
} from "lucide-react";
import { MenuSection } from "@/components/home/MenuSection";
import { WhatWeSellSection } from "@/components/home/WhatWeSellSection";
import {
  getDefaultRestaurant,
  getCategories,
  getProducts,
} from "@/lib/supabase/queries";

interface CategoryItem {
  id: string;
  name: string;
  image: string;
  count: string;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: "bestseller",
    name: "Bestseller",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80",
    count: "6",
  },
];

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  badge: string;
  badgeVariant: "bestseller" | "special" | "default" | "fresh" | "indulgent" | "chilled";
  image: string;
  prepTime: string;
  aspectRatio: string;
}

const FEATURED_PRODUCTS: ProductItem[] = [
  {
    id: "1",
    name: "Royal Chicken Dum Biryani",
    description:
      "Fragrant 2-year aged basmati layered with succulent farm chicken, caramel brown onions, saffron threads, and pot-sealed on low dum.",
    price: 349,
    category: "Biryani",
    badge: "Bestseller",
    badgeVariant: "bestseller",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
    prepTime: "25 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "2",
    name: "Smoked Paneer Tikka",
    description:
      "Hand-pressed artisanal cottage cheese steeped in Kashmiri red chilli, cold-pressed mustard oil, hung curd, and roasted over natural charcoal.",
    price: 289,
    category: "Starters",
    badge: "Chef's Special",
    badgeVariant: "special",
    image:
      "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
    prepTime: "20 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "3",
    name: "Old Delhi Butter Chicken",
    description:
      "Charcoal roasted tandoori chicken simmered slowly in a rich velvet satin makhani sauce infused with fresh butter and sun-dried fenugreek.",
    price: 389,
    category: "Main Course",
    badge: "Popular",
    badgeVariant: "default",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
    prepTime: "25 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "4",
    name: "Artisanal Butter Croissant",
    description:
      "Folded with 72 gossamer layers of pure cultured European butter. Hand-laminated, slow-proofed, and baked golden every sunrise.",
    price: 169,
    category: "Bakery",
    badge: "Freshly Baked",
    badgeVariant: "fresh",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80",
    prepTime: "Daily Batch",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "5",
    name: "Belgium Truffle Brownie",
    description:
      "Dense, molten center crafted from 70% single-origin Belgian dark chocolate, topped with house-made salted caramel and toasted pecans.",
    price: 199,
    category: "Desserts",
    badge: "Indulgent",
    badgeVariant: "indulgent",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
    prepTime: "Warm Serve",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "6",
    name: "Signature Cold Brew Coffee",
    description:
      "Single-estate Arabica beans coarse-ground and slow-steeped for 18 hours in cold filtered spring water. Poured over ice with whole milk.",
    price: 159,
    category: "Beverages",
    badge: "Chilled",
    badgeVariant: "chilled",
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80",
    prepTime: "Instant Serve",
    aspectRatio: "aspect-[4/3]",
  },
];

export default async function Home() {
  const restaurant = await getDefaultRestaurant();
  const slug =
    restaurant?.slug ||
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  let displayCategories = DEFAULT_CATEGORIES;
  let displayProducts = FEATURED_PRODUCTS;

  if (restaurant) {
    const [dbCats, dbProds] = await Promise.all([
      getCategories(restaurant.id),
      getProducts(restaurant.id),
    ]);

    if (dbCats && dbCats.length > 0) {
      // Strictly fetch from backend — no hardcoded "All Items" or mock categories
      displayCategories = dbCats.map((c) => {
        const categoryProducts = dbProds.filter((p) => p.category_id === c.id);
        const firstWithImage = categoryProducts.find((p) => p.image_url);
        return {
          id: c.id,
          name: c.name,
          image:
            firstWithImage?.image_url ||
            "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80",
          count: String(categoryProducts.length),
        };
      });
    }

    if (dbProds && dbProds.length > 0) {
      displayProducts = dbProds.map((p) => {
        const cat = dbCats.find((c) => c.id === p.category_id);
        return {
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: p.price,
          category: cat?.name || "Bestseller",
          badge: p.featured ? "Chef's Special" : "Fresh",
          badgeVariant: p.featured ? ("special" as const) : ("default" as const),
          image:
            p.image_url ||
            "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
          prepTime: "Freshly Made",
          aspectRatio: "aspect-[4/3]",
        };
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header cartCount={0} />

      {/* ═══ HERO SECTION — Full-bleed HD background (sits under transparent navbar) ═══ */}
      <section className="relative overflow-hidden border-b border-[#91885D]/30 min-h-screen flex items-center justify-center">
        {/* HD Background image — vivid food grading, max quality */}
        <Image
          src="/main.jpeg"
          alt="Artisanal bakery spread with fresh breads, cakes, muffins, cookies and chocolate spreads"
          fill
          priority
          className="object-cover object-[50%_45%] sm:object-[center_40%] contrast-[1.06] saturate-[1.12] brightness-[0.96] transition-transform duration-1000 scale-[1.01]"
          sizes="100vw"
          quality={100}
        />

        {/* Dynamic HD Photographic Lighting & Gradients */}
        {/* Ambient warm studio lighting vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,37,31,0.15)_0%,rgba(41,37,31,0.55)_80%,rgba(41,37,31,0.75)_100%)]" />
        
        {/* Directional light fade for top navbar transparency & bottom blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#29251F]/60 via-transparent to-[#29251F]/70 sm:from-[#29251F]/65 sm:via-[#29251F]/20 sm:to-[#29251F]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#D9BC9E]/20 via-transparent to-transparent pointer-events-none" />

        {/* Crisp edge vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(41,37,31,0.35)] sm:shadow-[inset_0_0_200px_60px_rgba(41,37,31,0.35)] pointer-events-none" />

        {/* ── Decorative corner ornaments ── */}
        <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-16 h-16 sm:w-24 sm:h-24 border-t-2 border-l-2 border-[#F5EBDD]/20 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-6 right-6 sm:top-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 border-t-2 border-r-2 border-[#F5EBDD]/20 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 w-16 h-16 sm:w-24 sm:h-24 border-b-2 border-l-2 border-[#F5EBDD]/20 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 border-b-2 border-r-2 border-[#F5EBDD]/20 rounded-br-lg pointer-events-none" />

        {/* Content — centered */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 sm:px-8 py-16 sm:py-20 text-center">

          {/* Heading with shimmer effect */}
          <h1 className="font-serif text-[2.75rem] sm:text-5xl lg:text-[4rem] xl:text-[4.75rem] font-bold leading-[1.08] tracking-tight text-[#F5EBDD] drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            Artisanal Bakery &{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block text-[#E8D5BC] italic font-normal">
              Pure Indulgence.
              {/* Decorative underline swirl */}
              <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C26B59] to-transparent" />
            </span>
          </h1>

          {/* Elegant ornamental divider */}
          <div className="flex items-center justify-center gap-3 my-6 sm:my-8">
            <span className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#C26B59]/60" />
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#C26B59]/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#C26B59]" />
              <span className="h-1 w-1 rounded-full bg-[#C26B59]/50" />
            </span>
            <span className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#C26B59]/60" />
          </div>

          {/* Description */}
          <p className="text-base sm:text-lg lg:text-xl text-[#F5EBDD]/90 leading-relaxed max-w-xl mx-auto font-light tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            Fresh sourdough, zero-sugar spreads & gourmet desserts — handcrafted daily, delivered to your doorstep.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-8 sm:mt-10">
            <Link href="/#menu">
              <Button
                variant="cta"
                size="lg"
                className="gap-2 rounded-full px-9 py-4 text-sm shadow-[0_8px_32px_rgba(194,107,89,0.4)] hover:shadow-[0_12px_40px_rgba(194,107,89,0.5)] transition-shadow duration-300"
              >
                Order Now
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Button>
            </Link>
            <Link href="/#menu">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-9 py-4 text-sm font-bold bg-[#F5EBDD] text-[#29251F] hover:bg-white hover:text-[#C26B59] border border-[#E0CFBB] shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 active:scale-95"
              >
                View Menu
              </Button>
            </Link>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-10 sm:mt-12 pt-5 border-t border-[#F5EBDD]/15">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-[#C26B59] text-[#C26B59]" />
              <div>
                <span className="text-xs font-bold text-[#F5EBDD]">4.9</span>
                <span className="text-[10px] text-[#F5EBDD]/70 ml-1">500+ reviews</span>
              </div>
            </div>
            <div className="h-4 w-px bg-[#F5EBDD]/20" />
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[#C26B59]" />
              <span className="text-[11px] font-medium text-[#F5EBDD]/85">Made on order</span>
            </div>
            <div className="h-4 w-px bg-[#F5EBDD]/20 hidden sm:block" />
            <div className="items-center gap-2 hidden sm:flex">
              <Award className="h-3.5 w-3.5 text-[#E8D5BC]" />
              <span className="text-[11px] font-medium text-[#F5EBDD]/85">100% Eggless</span>
            </div>
          </div>

        </div>

        {/* ── Scroll indicator ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 animate-bounce">
          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#F5EBDD]/50">Scroll</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-[#F5EBDD]/40">
            <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ═══ OUR MENU SECTION (MATCHING PHOTO) ═══ */}
      <MenuSection slug={slug} />

      {/* ═══ WHAT WE SELL SECTION (MATCHING PHOTO) ═══ */}
      <WhatWeSellSection />

      <Footer />
    </div>
  );
}
