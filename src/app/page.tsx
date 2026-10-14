import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Clock, Star, Award } from "lucide-react";
import { MenuSection } from "@/components/home/MenuSection";
import { FounderNoteSection } from "@/components/home/FounderNoteSection";
import { OrderNowButton } from "@/components/home/OrderNowButton";
import { getDefaultRestaurant, getCategories, getProducts } from "@/lib/supabase/queries";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const slug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  const restaurant = await getDefaultRestaurant();
  const categories = restaurant ? await getCategories(restaurant.id) : [];
  const products = restaurant ? await getProducts(restaurant.id) : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header cartCount={0} />

      {/* ═══ HERO SECTION — Full-bleed HD background (sits under transparent navbar) ═══ */}
      <section className="relative overflow-hidden border-b border-[#91885D]/30 min-h-[100svh] sm:min-h-screen flex items-center justify-center">
        {/* HD Background image — vivid food grading, phone-optimized focal point & responsive sizes */}
        <Image
          src="/main_photo_f.jpeg"
          alt="The Indulgent Spoon artisanal bakery spread with handcrafted sourdough, hazelnut chocolate spread, cakes and cookies"
          fill
          priority
          fetchPriority="high"
          className="object-cover object-[48%_44%] sm:object-[center_42%] contrast-[1.05] saturate-[1.10] brightness-[0.98]"
          sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 100vw"
          quality={82}
        />

        {/* Dynamic HD Photographic Lighting & Gradients */}
        {/* Ambient warm studio lighting vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,37,31,0.18)_0%,rgba(41,37,31,0.50)_75%,rgba(41,37,31,0.75)_100%)]" />

        {/* Directional light fade for top navbar transparency & bottom blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#29251F]/70 via-[#29251F]/25 to-[#29251F]/75 sm:from-[#29251F]/65 sm:via-[#29251F]/20 sm:to-[#29251F]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#D9BC9E]/20 via-transparent to-transparent pointer-events-none" />

        {/* Crisp edge vignette — calibrated subtly on mobile to preserve delicious food details */}
        <div className="absolute inset-0 shadow-[inset_0_0_50px_15px_rgba(41,37,31,0.25)] sm:shadow-[inset_0_0_200px_60px_rgba(41,37,31,0.35)] pointer-events-none" />

        {/* ── Decorative corner ornaments (scaled for phone & desktop) ── */}
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 w-8 h-8 sm:w-24 sm:h-24 border-t-2 border-l-2 border-[#F5EBDD]/20 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-4 right-4 sm:top-10 sm:right-10 w-8 h-8 sm:w-24 sm:h-24 border-t-2 border-r-2 border-[#F5EBDD]/20 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-4 left-4 sm:bottom-10 sm:left-10 w-8 h-8 sm:w-24 sm:h-24 border-b-2 border-l-2 border-[#F5EBDD]/20 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 w-8 h-8 sm:w-24 sm:h-24 border-b-2 border-r-2 border-[#F5EBDD]/20 rounded-br-lg pointer-events-none" />

        {/* Content — centered */}
        <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-20 text-center flex flex-col items-center justify-center">

          {/* Heading with shimmer effect & responsive typography */}
          <h1 className="font-serif text-[2.2rem] xs:text-[2.6rem] sm:text-5xl lg:text-[4rem] xl:text-[4.75rem] font-bold leading-[1.12] sm:leading-[1.08] tracking-tight text-[#F5EBDD] drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
            Artisanal Bakery &{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block text-[#E8D5BC] italic font-normal">
              Pure Indulgence.
              {/* Decorative underline swirl */}
              <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C26B59] to-transparent" />
            </span>
          </h1>

          {/* Elegant ornamental divider */}
          <div className="flex items-center justify-center gap-3 my-5 sm:my-8">
            <span className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#C26B59]/60" />
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#C26B59]/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#C26B59]" />
              <span className="h-1 w-1 rounded-full bg-[#C26B59]/50" />
            </span>
            <span className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#C26B59]/60" />
          </div>

          {/* Description */}
          <p className="text-sm sm:text-lg lg:text-xl text-[#F5EBDD]/95 leading-relaxed max-w-md sm:max-w-xl mx-auto font-light tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
            Fresh sourdough, zero-sugar spreads & gourmet desserts — handcrafted daily, delivered to your doorstep.
          </p>

          {/* CTAs */}
          <div className="flex justify-center mt-6 sm:mt-10">
            <OrderNowButton />
          </div>

          {/* Quick stats row — tailored compact badge display on phones */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-6 mt-8 sm:mt-12 pt-4 sm:pt-5 border-t border-[#F5EBDD]/20">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[#C26B59] text-[#C26B59]" />
              <div>
                <span className="text-xs font-bold text-[#F5EBDD]">4.9</span>
                <span className="text-[10px] text-[#F5EBDD]/80 ml-1">500+ reviews</span>
              </div>
            </div>
            <div className="h-3.5 sm:h-4 w-px bg-[#F5EBDD]/25" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 text-[#C26B59]" />
              <span className="text-[11px] font-medium text-[#F5EBDD]/90">Made on order</span>
            </div>
            <div className="h-3.5 sm:h-4 w-px bg-[#F5EBDD]/25" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Award className="h-3.5 w-3.5 text-[#E8D5BC]" />
              <span className="text-[11px] font-medium text-[#F5EBDD]/90">100% Eggless</span>
            </div>
          </div>

        </div>

        {/* ── Scroll indicator (GPU-composited bounce) ── */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 animate-bounce will-change-transform">
            <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#F5EBDD]/80">Scroll</span>
            <svg width="14" height="9" viewBox="0 0 16 10" fill="none" className="text-[#F5EBDD]/70 sm:w-4 sm:h-2.5">
              <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ OUR MENU SECTION (MATCHING PHOTO) ═══ */}
      <MenuSection
        slug={slug}
        initialRestaurantId={restaurant?.id}
        initialCategories={categories}
        initialProducts={products}
      />

      {/* ═══ FOUNDER'S NOTE ═══ */}
      <FounderNoteSection />

      <Footer />
    </div>
  );
}
