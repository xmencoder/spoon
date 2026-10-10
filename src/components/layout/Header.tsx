"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { useCart, DEFAULT_RESTAURANT_SLUG } from "@/lib/store/CartContext";

interface HeaderProps {
  cartCount?: number;
}

export function Header({ cartCount: initialCartCount }: HeaderProps) {
  const { totalItems, openCartDrawer, restaurantSlug } = useCart();
  const [isBouncing, setIsBouncing] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleFlyCompleted = () => {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 700);
      return () => clearTimeout(timer);
    };

    window.addEventListener("cart-item-fly-completed", handleFlyCompleted);
    return () => {
      window.removeEventListener("cart-item-fly-completed", handleFlyCompleted);
    };
  }, []);

  const effectiveCartCount = totalItems !== undefined ? totalItems : (initialCartCount || 0);
  const activeSlug = restaurantSlug || DEFAULT_RESTAURANT_SLUG;

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full shadow-[0_4px_20px_rgba(41,37,31,0.18)]">
      {/* ── 1. TOP STRIPED AWNING PATTERN BAND ── */}
      <div className="relative w-full h-5 sm:h-6 overflow-hidden bg-[#7B784E]">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="awning-stripes-header"
              width="26"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="13" height="24" fill="#DAC4A8" />
              <polygon points="6.5,7 9.5,12 6.5,17 3.5,12" fill="#5E5C3B" />
              <rect x="13" y="0" width="13" height="24" fill="#7E7B53" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#awning-stripes-header)" />
        </svg>
      </div>

      {/* ── 2. MAIN OLIVE GREEN NAVBAR ── */}
      <div className="relative bg-[#7A774D] h-14 sm:h-16">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-8 flex items-center justify-between relative">
          {/* ── LEFT NAVIGATION LINKS ── */}
          <nav className="flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-serif font-medium tracking-wide">
            <Link
              href="/"
              className={`transition-colors duration-200 ${
                pathname === "/"
                  ? "text-[#F8F2E8] hover:text-white"
                  : "text-[#F0E7D8] hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              href="/#menu"
              className="relative text-[#FAF5ED] font-semibold transition-colors duration-200 group"
            >
              <span>Menu</span>
              <span className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-[#E8DEC8] rounded-full" />
            </Link>

            <Link
              href="/#founders-note"
              className="text-[#F0E7D8] hover:text-white transition-colors duration-200 hidden sm:inline"
            >
              Our Story
            </Link>


          </nav>

          {/* ── CENTER LOGO (mostly inside navbar, just a tiny bit peeking out) ── */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-[44%] z-30 select-none pointer-events-auto">
            <Link href="/" className="block group">
              <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] md:w-[96px] md:h-[96px] transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_3px_10px_rgba(41,37,31,0.25)]">
                <Image
                  src="/logo-brand.png"
                  alt="The Indulgent Spoon"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 72px, (max-width: 768px) 84px, 96px"
                />
              </div>
            </Link>
          </div>

          {/* ── RIGHT ACTIONS: CART ── */}
          <div className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-serif">

            <Link
              id="navbar-cart-icon"
              data-navbar-cart
              href={`/store/${activeSlug}/cart`}
              className={`relative p-1.5 text-[#E6DBC9] hover:text-white transition-all duration-200 flex items-center justify-center cursor-pointer group rounded-full ${
                isBouncing ? "animate-cart-bounce text-white ring-2 ring-[#E8D5BC]/80 bg-[#68653F]" : ""
              }`}
              aria-label="View Shopping Cart"
              title="View Cart"
            >
              <ShoppingCart
                className={`w-5 h-5 transition-colors ${
                  isBouncing ? "text-white" : "text-[#EAE0D1] group-hover:text-white"
                }`}
                strokeWidth={1.75}
              />
              {effectiveCartCount > 0 && (
                <span
                  className={`absolute -top-1 -right-2 bg-[#B54A3D] text-white text-[9.5px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border border-[#7A774D] transition-transform ${
                    isBouncing ? "scale-125 ring-2 ring-white" : "animate-in zoom-in-50"
                  }`}
                >
                  {effectiveCartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Tiny spacer for the small bottom overhang */}
      <div className="h-2 sm:h-3 bg-transparent pointer-events-none" />
    </header>
  );
}
