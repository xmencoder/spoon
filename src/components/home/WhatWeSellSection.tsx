"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryArchCard {
  id: string;
  archText: string;
  categorySlug: string;
  title: string;
  description: string;
  image: string;
  theme: "olive" | "rose" | "cream" | "terracotta";
  iconType: "cake" | "muffin" | "wheat" | "jar" | "leaf" | "gift";
}

const CATEGORY_ARCH_CARDS: CategoryArchCard[] = [
  {
    id: "tea-cake",
    archText: "SIMPLE PLEASURES",
    categorySlug: "tea-cake",
    title: "Tea Cake",
    description: "Classic bakes for everyday joy.",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    theme: "olive",
    iconType: "cake",
  },
  {
    id: "muffins",
    archText: "LITTLE BUNDLES OF HAPPINESS",
    categorySlug: "muffins",
    title: "Muffins",
    description: "Soft, fluffy & always a good idea.",
    image:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&auto=format&fit=crop&q=80",
    theme: "rose",
    iconType: "muffin",
  },
  {
    id: "sourdough",
    archText: "SLOWLY CRAFTED",
    categorySlug: "sourdough",
    title: "Sourdough",
    description: "Real ingredients. Real flavour. Real good.",
    image:
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600&auto=format&fit=crop&q=80",
    theme: "cream",
    iconType: "wheat",
  },
  {
    id: "spreads",
    archText: "SPREAD GOODNESS",
    categorySlug: "spreads",
    title: "Spreads",
    description: "Because everything tastes better with a little more.",
    image:
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80",
    theme: "terracotta",
    iconType: "jar",
  },
  {
    id: "sugar-free",
    archText: "GOODNESS WITHOUT COMPROMISE",
    categorySlug: "sugar-free",
    title: "Sugar Free",
    description: "All the taste. None of the guilt.",
    image:
      "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&auto=format&fit=crop&q=80",
    theme: "olive",
    iconType: "leaf",
  },
  {
    id: "cake-jars",
    archText: "HAPPINESS IN A JAR",
    categorySlug: "cake-jars",
    title: "Cake Jars",
    description: "Layers of love in every spoon.",
    image:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80",
    theme: "rose",
    iconType: "jar",
  },
  {
    id: "gift-boxes",
    archText: "MORE THAN A GIFT",
    categorySlug: "gift-boxes",
    title: "Gift Boxes",
    description: "Thoughtful bakes for your loved ones.",
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80",
    theme: "cream",
    iconType: "gift",
  },
];

function CardCategoryIcon({ type, isLight }: { type: string; isLight: boolean }) {
  const strokeColor = isLight ? "#F6EFE6" : "#463C31";

  switch (type) {
    case "cake":
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
          <path d="M4 16s4-1 8-1 8 1 8 1" />
          <path d="M2 21h20" />
          <path d="M7 8v3" />
          <path d="M12 5v6" />
          <path d="M17 8v3" />
        </svg>
      );
    case "muffin":
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 10a6 6 0 0 0-12 0c0 .7.1 1.4.4 2H5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-.6c.4-.6.6-1.3.6-2Z" />
          <path d="M7 17l1.5 4h7l1.5-4" />
        </svg>
      );
    case "wheat":
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2 22 10-10" />
          <path d="M16 8a4 4 0 0 0-6 0 4 4 0 0 0 0 6 4 4 0 0 0 6 0 4 4 0 0 0 0-6Z" />
          <path d="M14 6a4 4 0 0 1 4 4 4 4 0 0 1-4 4" />
          <path d="M20 4a4 4 0 0 1 2 2 4 4 0 0 1-2 2" />
        </svg>
      );
    case "jar":
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="7" width="14" height="14" rx="3" />
          <path d="M8 3h8" />
          <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
      );
    case "leaf":
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "gift":
    default:
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13" />
          <path d="M19 12H5" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </svg>
      );
  }
}

function CurvedArchText({ text, isLight }: { text: string; isLight: boolean }) {
  const textColor = isLight ? "#F6EFE6" : "#4A3F33";

  return (
    <div className="w-full h-8 flex items-center justify-center -mb-1 px-1">
      <svg
        viewBox="0 0 140 28"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <path
          id={`curve-${text.replace(/\s+/g, "-")}`}
          d="M 8 24 Q 70 3 132 24"
          fill="transparent"
        />
        <text
          fill={textColor}
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="0.12em"
          className="uppercase tracking-widest font-sans"
        >
          <textPath
            href={`#curve-${text.replace(/\s+/g, "-")}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {text}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

export function WhatWeSellSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth scroll carousel to a specific index
  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cards = container.querySelectorAll<HTMLElement>("[data-card-index]");
    if (cards[index]) {
      const card = cards[index];
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = cardLeft - (containerWidth - cardWidth) / 2;

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
      setActiveIndex(index);
    }
  }, []);

  // Next / Prev handlers
  const handlePrev = useCallback(() => {
    const nextIdx =
      activeIndex > 0 ? activeIndex - 1 : CATEGORY_ARCH_CARDS.length - 1;
    scrollToIndex(nextIdx);
  }, [activeIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const nextIdx =
      activeIndex < CATEGORY_ARCH_CARDS.length - 1 ? activeIndex + 1 : 0;
    scrollToIndex(nextIdx);
  }, [activeIndex, scrollToIndex]);

  // Auto-slide on mobile view (every 3.5 seconds)
  useEffect(() => {
    if (isUserInteracting) return;

    const timer = setInterval(() => {
      // Only auto-slide if on mobile/small screen where carousel is scrollable
      if (carouselRef.current) {
        const isScrollable =
          carouselRef.current.scrollWidth > carouselRef.current.clientWidth;
        if (isScrollable) {
          setActiveIndex((prev) => {
            const next = prev < CATEGORY_ARCH_CARDS.length - 1 ? prev + 1 : 0;
            scrollToIndex(next);
            return next;
          });
        }
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [isUserInteracting, scrollToIndex]);

  // Pause auto-slide temporarily when user touches or scrolls
  const handleTouchStart = () => {
    setIsUserInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 5000);
  };

  // When user clicks a category: Select that category in MenuSection and scroll to #menu!
  const handleCategoryClick = (categorySlug: string) => {
    // 1. Dispatch custom event to MenuSection
    window.dispatchEvent(
      new CustomEvent("select-category", { detail: categorySlug })
    );

    // 2. Scroll smoothly to #menu
    const menuEl = document.getElementById("menu");
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = "menu";
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#F4E9DC] py-16 sm:py-20 lg:py-24 text-[#29251F]">
      {/* Vintage subtle ambient background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#FFF9F0_0%,rgba(244,233,220,0.5)_50%,rgba(217,188,158,0.25)_100%)]" />

      {/* Decorative top checkered band */}
      <div
        className="absolute top-0 left-0 right-0 h-3 opacity-25"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #7D8267 0, #7D8267 10px, transparent 0, transparent 20px)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── HEADER WITH VINTAGE CALLOUTS & NOTES ───────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="relative mb-10 sm:mb-16 text-center">
          {/* Top-Left Calligraphy Doodle */}
          <div className="hidden lg:block absolute left-2 top-0 text-left -rotate-6 pointer-events-none">
            <span
              className="text-xl xl:text-2xl text-[#B25345] leading-tight block"
              style={{ fontFamily: "var(--font-caveat), cursive, Georgia, serif" }}
            >
              Baked <br />
              with love, <br />
              for moodier days <br />
              and brighter ones.
              <span className="block mt-1 text-2xl">♡</span>
            </span>
          </div>

          {/* Top-Right Vintage Pinned Note & Antique Plate */}
          <div className="hidden lg:flex items-center gap-3 absolute right-0 -top-4 pointer-events-none">
            {/* Pinned Note */}
            <div className="relative bg-[#FAF2E6] border border-[#D5C6B1] p-3.5 sm:p-4 rounded-lg shadow-md rotate-3 max-w-[160px] text-center">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#B25345] shadow-sm border border-white" />
              <span
                className="text-lg xl:text-xl text-[#B25345] font-normal leading-snug block"
                style={{ fontFamily: "var(--font-caveat), cursive, Georgia, serif" }}
              >
                Good Desserts <br />
                Happier People
              </span>
              <span className="text-xl text-[#B25345] block mt-0.5">♡</span>
            </div>

            {/* Vintage Plate Rim Graphic */}
            <div className="relative w-20 h-20 xl:w-24 xl:h-24 rounded-full border-4 border-[#8C9278] bg-[#F9F4EC] shadow-md flex items-center justify-center -mr-6 opacity-85">
              <span className="text-[7px] uppercase tracking-widest text-[#71765F] font-serif font-bold text-center rotate-45">
                THE INDULGENT SPOON
              </span>
            </div>
          </div>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 sm:w-12 bg-[#9E917E]/40" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#7A6E5D]">
              A WORLD OF SWEETNESS
            </span>
            <span className="h-px w-6 sm:w-12 bg-[#9E917E]/40" />
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#29251F] leading-[1.08] tracking-tight">
            What We Sell
          </h2>

          {/* Delicate Spoon Divider */}
          <div className="flex items-center justify-center gap-3 my-3 sm:my-4">
            <span className="h-px w-10 sm:w-16 bg-[#9E917E]/40" />
            <svg
              className="w-5 h-5 text-[#8A8F76] transform -rotate-45"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.4 4.6a4.2 4.2 0 0 0-6 0L4.5 13.5a1.5 1.5 0 0 0 0 2.1l3.9 3.9a1.5 1.5 0 0 0 2.1 0l8.9-8.9a4.2 4.2 0 0 0 0-6Zm-1.4 4.6-2.5 2.5-3.2-3.2 2.5-2.5a2.2 2.2 0 0 1 3.2 3.2Z" />
            </svg>
            <span className="h-px w-10 sm:w-16 bg-[#9E917E]/40" />
          </div>

          {/* Subtitle */}
          <p className="max-w-xl mx-auto text-sm sm:text-base text-[#665B4C] leading-relaxed font-light">
            From everyday treats to special moments, <br className="hidden sm:block" />
            there&apos;s a little indulgence for everyone.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── 7 ARCHED CARDS: AUTO-SLIDE ON MOBILE, GRID DESKTOP ─ */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="relative group/carousel">
          {/* Mobile Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#FAF5ED]/95 border border-[#D5C6B1] shadow-md flex items-center justify-center text-[#554D3D] active:scale-90 transition-all cursor-pointer"
            aria-label="Previous category"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#FAF5ED]/95 border border-[#D5C6B1] shadow-md flex items-center justify-center text-[#554D3D] active:scale-90 transition-all cursor-pointer"
            aria-label="Next category"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Cards Container: Larger & nicer on mobile (w-[270px]), auto-sliding & swipeable */}
          <div
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={handleTouchStart}
            onMouseLeave={handleTouchEnd}
            className="flex lg:grid lg:grid-cols-7 gap-4 sm:gap-5 lg:gap-3.5 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory py-4 px-2 sm:px-4 lg:px-0 scroll-smooth"
          >
            {CATEGORY_ARCH_CARDS.map((card, idx) => {
              const isOlive = card.theme === "olive";
              const isRose = card.theme === "rose";
              const isCream = card.theme === "cream";
              const isTerracotta = card.theme === "terracotta";
              const isLightText = isOlive || isTerracotta;

              let titleColor = "text-[#F6EFE6]";
              let descColor = "text-[#EDE3D4]/90";
              let buttonBg = "bg-[#F6EFE6] text-[#29251F] hover:bg-white";

              if (isRose) {
                titleColor = "text-[#29251F]";
                descColor = "text-[#4A3E31]";
                buttonBg = "bg-[#A75949] text-[#F6EFE6] hover:bg-[#8F483A]";
              } else if (isCream) {
                titleColor = "text-[#29251F]";
                descColor = "text-[#55493C]";
                buttonBg = "bg-[#A75949] text-[#F6EFE6] hover:bg-[#8F483A]";
              } else if (isTerracotta) {
                titleColor = "text-[#F6EFE6]";
                descColor = "text-[#F0E6D8]/90";
                buttonBg = "bg-[#F6EFE6] text-[#29251F] hover:bg-white";
              }

              return (
                <div
                  key={card.id}
                  data-card-index={idx}
                  onClick={() => handleCategoryClick(card.categorySlug)}
                  className="group relative flex-none w-[265px] sm:w-[280px] lg:w-auto snap-center flex flex-col justify-between rounded-t-[84px] lg:rounded-t-[72px] rounded-b-3xl p-4 sm:p-4 lg:p-3 shadow-[0_6px_22px_rgba(41,37,31,0.08)] hover:shadow-[0_12px_32px_rgba(41,37,31,0.15)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer overflow-hidden border active:scale-[0.98]"
                  style={{
                    backgroundColor:
                      isOlive
                        ? "#6A7756"
                        : isRose
                        ? "#DFB5A5"
                        : isTerracotta
                        ? "#A66249"
                        : "#EFE3D2",
                    borderColor:
                      isOlive
                        ? "#5D6A4A"
                        : isRose
                        ? "#D1A696"
                        : isTerracotta
                        ? "#95533D"
                        : "#DFD2C1",
                  }}
                >
                  {/* Curved Header Text */}
                  <div className="pt-2 sm:pt-3">
                    <CurvedArchText
                      text={card.archText}
                      isLight={isLightText}
                    />
                  </div>

                  {/* Arched Image Window - larger & prominent */}
                  <div className="relative aspect-[1/1.08] w-full mt-2 rounded-t-[68px] lg:rounded-t-[54px] rounded-b-2xl overflow-hidden shadow-inner border border-black/10 bg-black/5">
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 280px, 16vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-50" />
                  </div>

                  {/* Card Content - Clean & refined */}
                  <div className="flex flex-col items-center text-center pt-3.5 sm:pt-4 pb-1.5 flex-1 justify-between">
                    {/* Category Miniature Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-2xs ${
                        isLightText ? "bg-white/20" : "bg-black/10"
                      }`}
                    >
                      <CardCategoryIcon
                        type={card.iconType}
                        isLight={isLightText}
                      />
                    </div>

                    {/* Category Title */}
                    <h3
                      className={`font-serif text-lg sm:text-xl lg:text-base font-bold leading-tight ${titleColor}`}
                    >
                      {card.title}
                    </h3>

                    {/* Subtitle / Description */}
                    <p
                      className={`mt-1.5 text-xs sm:text-sm lg:text-[11.5px] leading-snug font-normal line-clamp-2 px-1 ${descColor}`}
                    >
                      {card.description}
                    </p>

                    {/* Bottom Circle Arrow Button */}
                    <div className="mt-3.5">
                      <span
                        className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shadow-xs transition-all group-hover:scale-110 ${buttonBg}`}
                        aria-hidden="true"
                      >
                        <ArrowRight className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Dot Progress Indicators */}
          <div className="lg:hidden flex items-center justify-center gap-1.5 mt-3">
            {CATEGORY_ARCH_CARDS.map((_, i) => (
              <button
                key={`dot-${i}`}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIndex === i
                    ? "w-6 bg-[#B25345]"
                    : "w-1.5 bg-[#D5C6B1] hover:bg-[#B25345]/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── FOOTER ROW: EXPLORE OUR MENU CTA & VINTAGE TOWEL ─ */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="relative mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Bottom-Left Vintage Linen Towel & Crumbs */}
          <div className="hidden lg:flex items-center gap-2 text-left pointer-events-none">
            <div className="relative bg-[#E8DDD0] border border-[#CEBFAD] px-4 py-2.5 rounded-lg shadow-sm -rotate-2">
              <span className="text-[8px] uppercase tracking-widest text-[#706454] font-bold block">
                — THE —
              </span>
              <span className="font-serif font-bold text-xs text-[#29251F] tracking-wider">
                INDULGENT SPOON
              </span>
            </div>
            {/* Little cookie crumb dots */}
            <div className="flex gap-1 items-center opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B25345]" />
              <span className="w-1 h-1 rounded-full bg-[#7D8267]" />
            </div>
          </div>

          {/* Center Explore Our Menu Button */}
          <div className="mx-auto flex items-center justify-center">
            <button
              onClick={() => {
                const el = document.getElementById("menu");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-full bg-[#5D664A] hover:bg-[#4E563D] text-[#F6EFE6] font-semibold text-xs sm:text-sm tracking-widest uppercase shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border border-[#7A8563]/60 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E8D5BC] group-hover:rotate-12 transition-transform" />
              <span>EXPLORE OUR MENU</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <Sparkles className="w-3.5 h-3.5 text-[#E8D5BC] group-hover:-rotate-12 transition-transform" />
            </button>
          </div>

          {/* Bottom-Right Handwritten Callout */}
          <div className="text-center sm:text-right">
            <span
              className="text-lg sm:text-2xl text-[#B25345] leading-tight block -rotate-3 pointer-events-none"
              style={{ fontFamily: "var(--font-caveat), cursive, Georgia, serif" }}
            >
              Same Ingredients. <br className="hidden sm:block" />
              More Happiness.
              <span className="inline-block ml-1 text-2xl">♡</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
