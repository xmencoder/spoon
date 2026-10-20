"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Loader2, ChefHat } from "lucide-react";

export interface SearchResultItem {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  originalPrice: number;
  hasDiscount: boolean;
  imageUrl: string;
  slug: string;
  description?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const QUICK_SEARCH_CHIPS = [
  "Bestsellers",
  "Cakes",
  "Sourdough",
  "Cookies",
  "Muffins",
  "Brownies",
  "Zero Sugar",
];

export function GlobalSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
}: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialQuery]);

  // Debounced live search
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setResults(data.results || []);
            setTotalCount(data.total || (data.results ? data.results.length : 0));
          }
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const handleSelectProduct = useCallback(
    (product: SearchResultItem) => {
      onClose();
      router.push(`/store/${product.slug || "the-indulgent-spoon"}/product/${product.id}`);
    },
    [router, onClose]
  );

  const handleViewAllInMenu = useCallback(() => {
    onClose();
    if (query.trim()) {
      router.push(`/full-menu?search=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(`/full-menu`);
    }
  }, [router, onClose, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectProduct(results[selectedIndex]);
      } else {
        handleViewAllInMenu();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search bakery menu"
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#1C1814]/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-2xl bg-[#FAF6EE] border border-[#E7DCCE] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-[#29251F]"
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-[#E8DEC8] bg-[#F4E9DC]">
          <Search className="w-5 h-5 text-[#7A774D] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            placeholder="Search cakes, sourdough, cookies, desserts..."
            className="w-full bg-transparent text-[#29251F] placeholder:text-[#8C8273] font-serif text-base sm:text-lg focus:outline-hidden"
          />

          {loading && (
            <Loader2 className="w-5 h-5 text-[#7A774D] animate-spin shrink-0" />
          )}

          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(-1);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-[#7A774D] hover:bg-[#EAE0D1] transition-colors"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7A774D] hover:text-[#29251F] hover:bg-[#EAE0D1] transition-colors"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#F9F3EA] border-b border-[#E8DEC8]/60 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[#8C8273] font-serif shrink-0 font-medium">
            Quick:
          </span>
          {QUICK_SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip);
                inputRef.current?.focus();
              }}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-serif transition-colors cursor-pointer ${
                query.toLowerCase() === chip.toLowerCase()
                  ? "bg-[#7A774D] text-white"
                  : "bg-white/80 hover:bg-white text-[#4A4036] border border-[#E3D6C5]"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Results List / Empty State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 divide-y divide-[#EFE7D8]">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2 text-[11px] uppercase tracking-wider text-[#8C8273] font-semibold">
                <span>{query ? `Matching Treats (${totalCount})` : "Popular Bestsellers"}</span>
                <span className="hidden sm:inline">Use ↑ ↓ arrows to navigate</span>
              </div>

              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectProduct(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center gap-3.5 p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#EFE4D3] shadow-xs"
                        : "hover:bg-[#F5EDDE]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#E8DDD0] shrink-0 border border-[#DACFBF]/80 shadow-2xs">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-800">
                          <ChefHat className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#A34B3D] bg-[#A34B3D]/10 px-2 py-0.5 rounded-full">
                          {item.categoryName}
                        </span>
                        {item.hasDiscount && (
                          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                            Special Offer
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif font-bold text-sm sm:text-base text-[#29251F] truncate mt-0.5 group-hover:text-[#A34B3D] transition-colors">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[11px] text-[#7A6E5D] line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price & Action */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-bold text-sm sm:text-base text-[#29251F]">
                          ₹{item.price}
                        </span>
                        {item.hasDiscount && item.originalPrice > item.price && (
                          <span className="text-xs text-[#998E7E] line-through">
                            ₹{item.originalPrice}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#7A774D] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        View item <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading && query ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EAE0D1] mx-auto flex items-center justify-center text-xl">
                🧁
              </div>
              <h4 className="font-serif font-bold text-base text-[#29251F]">
                No bakery treats found for &ldquo;{query}&rdquo;
              </h4>
              <p className="text-xs text-[#7A6E5D] max-w-sm mx-auto">
                Try searching for general keywords like <i>cake, sourdough, chocolate, cookies</i>, or browse our entire catalogue.
              </p>
              <button
                type="button"
                onClick={handleViewAllInMenu}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7A774D] hover:bg-[#68653F] text-white text-xs font-serif font-semibold shadow-md transition-all cursor-pointer"
              >
                Browse Full Menu <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Bottom Action Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#F4E9DC] border-t border-[#E8DEC8] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#7A6E5D] font-serif hidden sm:inline">
            Press <kbd className="bg-white/80 border border-[#D5C6B3] px-1.5 py-0.5 rounded text-[10px] font-mono">ESC</kbd> to exit
          </span>

          <button
            type="button"
            onClick={handleViewAllInMenu}
            className="w-full sm:w-auto ml-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-[#7A774D] hover:bg-[#68653F] active:bg-[#5E5C3B] text-white font-serif font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            {query ? `View all results in Full Menu (${totalCount})` : "Open Full Menu"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
