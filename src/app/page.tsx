import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Clock, Star, Award } from "lucide-react";
import { MenuSection } from "@/components/home/MenuSection";
import { FounderNoteSection } from "@/components/home/FounderNoteSection";
import { OrderNowButton } from "@/components/home/OrderNowButton";

export default function Home() {
  const slug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    "the-indulgent-spoon";

  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header cartCount={0} />

      {/* ═══ HERO SECTION — Full-bleed HD background (sits under transparent navbar) ═══ */}
      <section className="relative overflow-hidden border-b border-[#91885D]/30 min-h-screen flex items-center justify-center">
        {/* HD Background image — vivid food grading, optimized quality */}
        <Image
          src="/main.jpeg"
          alt="Artisanal bakery spread with fresh breads, cakes, muffins, cookies and chocolate spreads"
          fill
          priority
          fetchPriority="high"
          className="object-cover object-[50%_45%] sm:object-[center_40%] contrast-[1.06] saturate-[1.12] brightness-[0.96]"
          sizes="100vw"
          quality={75}
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
          <div className="flex justify-center mt-8 sm:mt-10">
            <OrderNowButton />
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

        {/* ── Scroll indicator (GPU-composited bounce) ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-1.5 animate-bounce will-change-transform">
            <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#F5EBDD]/80">Scroll</span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-[#F5EBDD]/70">
              <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ OUR MENU SECTION (MATCHING PHOTO) ═══ */}
      <MenuSection slug={slug} />

      {/* ═══ FOUNDER'S NOTE ═══ */}
      <FounderNoteSection />

      <Footer />
    </div>
  );
}
