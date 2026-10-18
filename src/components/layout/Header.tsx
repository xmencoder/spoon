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
          <nav className="flex items-center gap-3.5 sm:gap-6 md:gap-7 text-xs sm:text-sm font-serif font-medium tracking-wide">
            <Link
              href="/"
              className={`transition-colors duration-200 ${
                pathname === "/"
                  ? "text-[#FAF5ED] font-semibold"
                  : "text-[#F0E7D8] hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              href="/full-menu"
              className={`relative transition-colors duration-200 group ${
                pathname === "/full-menu" || pathname === "/menu"
                  ? "text-[#FAF5ED] font-semibold"
                  : "text-[#F0E7D8] hover:text-white"
              }`}
            >
              <span>Menu</span>
              <span
                className={`absolute -bottom-1 left-0 right-0 h-[1.5px] bg-[#E8DEC8] rounded-full transition-opacity ${
                  pathname === "/full-menu" || pathname === "/menu"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-60"
                }`}
              />
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
              href="/cart"
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

      {/* ── 3. CREATIVE FIXED WHATSAPP DIRECT ACTION BAR ── */}
      <a
        href="https://wa.me/919717123510?text=Hi%20The%20Indulgent%20Spoon!%20I'd%20like%20to%20place%20an%20order%20%F0%9F%8D%B0"
        target="_blank"
        rel="noopener noreferrer"
        id="navbar-whatsapp-bar"
        aria-label="Direct WhatsApp chat with admin at +91 97171 23510"
        className="group relative z-20 flex items-center w-full bg-gradient-to-r from-[#128C7E] via-[#25D366] to-[#128C7E] hover:from-[#0d7367] hover:via-[#20ba59] hover:to-[#0d7367] text-white py-1.5 sm:py-2 px-4 sm:px-8 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border-t border-black/10 overflow-hidden cursor-pointer"
      >
        {/* Subtle hover shimmer beam */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl w-full flex items-center justify-start gap-2 sm:gap-2.5">
          {/* WhatsApp Icon + Text */}
          <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white text-[#25D366] shadow-[0_1px_4px_rgba(0,0,0,0.18)] group-hover:scale-110 transition-transform duration-200 shrink-0">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              className="fill-current text-[#25D366] sm:w-[16px] sm:h-[16px]"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </span>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-[12px] sm:text-sm tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
              Order Directly on WhatsApp
            </span>
            <span className="text-white/90 text-[11px] sm:text-xs font-semibold group-hover:translate-x-0.5 transition-transform duration-200">
              ↗
            </span>
          </div>
        </div>
      </a>
    </header>
  );
}
