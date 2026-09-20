"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart, X } from "lucide-react";

import { useCart, DEFAULT_RESTAURANT_SLUG } from "@/lib/store/CartContext";

interface HeaderProps {
  cartCount?: number;
}

export function Header({ cartCount: initialCartCount }: HeaderProps) {
  const { totalItems, openCartDrawer, restaurantSlug } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

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
                  : "text-[#E6DBC9] hover:text-white"
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
              className="text-[#E6DBC9] hover:text-white transition-colors duration-200 hidden sm:inline"
            >
              Our Story
            </Link>
          </nav>

          {/* ── CENTER LOGO (mostly inside navbar, just a tiny bit peeking out) ── */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-[44%] z-30 select-none pointer-events-auto">
            <Link href="/" className="block group">
              <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] md:w-[96px] md:h-[96px] transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_3px_10px_rgba(41,37,31,0.25)]">
                <Image
                  src="/logo-m.png"
                  alt="The Indulgent Spoon"
                  fill
                  priority
                  className="object-contain"
                  sizes="96px"
                />
              </div>
            </Link>
          </div>

          {/* ── RIGHT ACTIONS: SEARCH & CART ── */}
          <div className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-serif">
            <div className="relative flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center bg-[#68653F] rounded-full px-2.5 py-1 border border-[#918D5D] transition-all">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cakes, cookies..."
                    autoFocus
                    className="bg-transparent text-xs text-[#FAF5ED] placeholder-[#D5C9B3] focus:outline-none w-28 sm:w-40 font-sans"
                  />
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="text-[#E6DBC9] hover:text-white p-0.5 ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-1.5 text-[#E6DBC9] hover:text-white transition-colors cursor-pointer group"
                >
                  <span className="hidden sm:inline text-xs sm:text-sm tracking-wide">
                    Search
                  </span>
                  <Search
                    className="w-4 h-4 text-[#E6DBC9] group-hover:text-white transition-colors"
                    strokeWidth={1.8}
                  />
                </button>
              )}
            </div>

            <Link
              href={`/store/${activeSlug}/cart`}
              className="relative p-1 text-[#E6DBC9] hover:text-white transition-colors flex items-center justify-center cursor-pointer group"
              aria-label="View Shopping Cart"
              title="View Cart"
            >
              <ShoppingCart
                className="w-5 h-5 text-[#EAE0D1] group-hover:text-white transition-colors"
                strokeWidth={1.75}
              />
              {effectiveCartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#B54A3D] text-white text-[9.5px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border border-[#7A774D] animate-in zoom-in-50">
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
