"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCart } from "@/lib/store/CartContext";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types/database";

export interface CategoryCard {
  id: string;
  name: string;
  count: string;
  image: string;
}

// Exactly only the categories requested by the user:
// Popular, Tea Cake, Muffins, Sourdough, Spreads, Sugar Free, Cake Jars, Gift Boxes
export const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: "popular",
    name: "Popular",
    count: "18 items",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "tea-cake",
    name: "Tea Cake",
    count: "12 items",
    image:
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "muffins",
    name: "Muffins",
    count: "14 items",
    image:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "sourdough",
    name: "Sourdough",
    count: "10 items",
    image:
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "spreads",
    name: "Spreads",
    count: "8 items",
    image:
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "sugar-free",
    name: "Sugar Free",
    count: "15 items",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "cake-jars",
    name: "Cake Jars",
    count: "16 items",
    image:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "gift-boxes",
    name: "Gift Boxes",
    count: "8 items",
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80",
  },
];

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isPopular?: boolean;
  badge?: string;
  tags: string[];
  image: string;
  doodleText?: string;
  hasChefHat?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  // Popular / Tea Cake
  {
    id: "og-choco-chip-butter-cake",
    name: "OG Choco Chip Butter Cake",
    price: 900,
    description: "Soft, buttery & loaded with choco chips. The Nanz Original.",
    category: "tea-cake",
    isPopular: true,
    badge: "POPULAR",
    tags: ["Bestseller", "Classic", "Eggless"],
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
    doodleText: "A slice of happiness ♡",
    hasChefHat: true,
  },
  {
    id: "intense-chocolate-butter-cake",
    name: "Intense Chocolate Butter Cake",
    price: 999,
    description: "Soft, buttery & intensely chocolatey.",
    category: "tea-cake",
    isPopular: true,
    badge: "NEW!",
    tags: ["Rich", "Gooey", "Chocolate Lover's"],
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "lemon-drizzle-cake",
    name: "Lemon Drizzle Tea Cake",
    price: 799,
    description: "A zesty classic soaked with Meyer lemon syrup for bright days.",
    category: "tea-cake",
    isPopular: true,
    badge: "NEW!",
    tags: ["Zesty", "Light", "Refreshing"],
    image:
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80",
    doodleText: "Zesty sunshine ♡",
  },

  // Muffins
  {
    id: "wild-blueberry-muffin",
    name: "Wild Blueberry Streusel Muffin",
    price: 500,
    description: "Bursting with juicy wild blueberries and crowned with crispy brown sugar streusel.",
    category: "muffins",
    isPopular: true,
    badge: "BESTSELLER",
    tags: ["Pack of 4", "Wild Berry", "Crisp Top"],
    image:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
    doodleText: "Berry delight ♡",
  },
  {
    id: "belgian-double-choco-muffin",
    name: "Double Belgian Choco Muffin",
    price: 500,
    description: "Rich dark chocolate muffin loaded with gooey Belgian chocolate molten drops.",
    category: "muffins",
    isPopular: false,
    badge: "POPULAR",
    tags: ["Pack of 4", "Molten Core", "Belgian Choco"],
    image:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80",
  },

  // Sourdough
  {
    id: "country-sourdough-batard",
    name: "Artisanal Country Sourdough",
    price: 290,
    description: "36-hour slow fermented wild yeast sourdough with blistered caramel crust and open crumb.",
    category: "sourdough",
    isPopular: true,
    badge: "BESTSELLER",
    tags: ["Wild Ferment", "No Commercial Yeast", "Vegan"],
    image:
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80",
    doodleText: "Golden crust ♡",
  },
  {
    id: "olive-rosemary-sourdough",
    name: "Kalamata Olive & Rosemary Sourdough",
    price: 340,
    description: "Infused with organic Tuscan extra virgin olive oil, fragrant rosemary, and Greek Kalamata olives.",
    category: "sourdough",
    isPopular: false,
    badge: "NEW!",
    tags: ["Artisanal", "Savory Herb", "Handcrafted"],
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  },

  // Spreads
  {
    id: "zero-sugar-hazelnut-spread",
    name: "Zero-Sugar Roasted Hazelnut Spread",
    price: 480,
    description: "Pure stone-ground Turkish hazelnuts blended with raw cacao and monkfruit sweetener.",
    category: "spreads",
    isPopular: true,
    badge: "POPULAR",
    tags: ["Zero Sugar", "70% Hazelnuts", "Keto Friendly"],
    image:
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&auto=format&fit=crop&q=80",
    doodleText: "Pure guilt-free ♡",
  },
  {
    id: "artisanal-salted-caramel-spread",
    name: "Artisanal Fleur de Sel Caramel",
    price: 390,
    description: "Slow-caramelized dairy cream simmered with Madagascar vanilla and mineral-rich sea salt.",
    category: "spreads",
    isPopular: false,
    badge: "NEW!",
    tags: ["Slow Simmered", "Vanilla Bean", "Luscious"],
    image:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
  },

  // Sugar Free
  {
    id: "sugar-free-almond-brownie",
    name: "Sugar-Free Almond Flour Brownie",
    price: 320,
    description: "Dense, fudgy brownie sweetened naturally with stevia extract & California almond flour.",
    category: "sugar-free",
    isPopular: true,
    badge: "POPULAR",
    tags: ["Zero Sugar", "Gluten Conscious", "Fudgy"],
    image:
      "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&auto=format&fit=crop&q=80",
    doodleText: "Guilt-free joy ♡",
  },
  {
    id: "sugar-free-cheesecake",
    name: "Sugar-Free Basque Burnt Cheesecake",
    price: 420,
    description: "Caramelized charred exterior with a molten creamy center, 100% refined sugar-free.",
    category: "sugar-free",
    isPopular: false,
    badge: "NEW!",
    tags: ["Zero Sugar", "Keto", "Rich & Creamy"],
    image:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80",
  },

  // Cake Jars
  {
    id: "belgian-truffle-cake-jar",
    name: "Belgian Truffle Cake Jar",
    price: 399,
    description: "Layers of moist devil's food sponge, silky Belgian ganache, and dark chocolate crispearls.",
    category: "cake-jars",
    isPopular: true,
    badge: "BESTSELLER",
    tags: ["Portable Delight", "Triple Layer", "Rich Truffle"],
    image:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80",
    doodleText: "Happiness in a jar ♡",
  },
  {
    id: "biscoff-mousse-cake-jar",
    name: "Lotus Biscoff Mousse Cake Jar",
    price: 420,
    description: "Fluffy vanilla sponge layered with Lotus spread, white chocolate mousse, and spiced cookie crumble.",
    category: "cake-jars",
    isPopular: true,
    badge: "POPULAR",
    tags: ["Biscoff Lover", "Creamy Mousse", "Crunchy"],
    image:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
  },

  // Gift Boxes
  {
    id: "assorted-cookie-tin",
    name: "Assorted Cookie Tin",
    price: 899,
    description: "3-in-1 cookie tin\nOG Choco Chip • Red Velvet • Double Choco Chip",
    category: "gift-boxes",
    isPopular: true,
    badge: "NEW!",
    tags: ["Assorted", "Perfect Gift", "Freshly Baked"],
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80",
    doodleText: "Happiness in every bite ♡",
  },
  {
    id: "gourmet-hamper-box",
    name: "The Indulgent Luxe Gift Hamper",
    price: 1850,
    description: "Curated gift box with assorted cookies, Belgian brownies, artisanal spread, and celebration note.",
    category: "gift-boxes",
    isPopular: true,
    badge: "BESTSELLER",
    tags: ["Luxe Box", "Hand-Tied", "Custom Note"],
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
  },
];

// Pure Veg Indian Green Icon Badge
function VegSymbol({ className = "" }: { className?: string }) {
  return (
    <div
      className={`border border-[#238234] bg-white flex items-center justify-center p-0.5 rounded-[3px] shrink-0 ${className}`}
      title="100% Vegetarian / Eggless"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#238234]" />
    </div>
  );
}

// Ornate Vintage Leaf Divider for Category Card
function LeafDivider({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1.5 my-1 opacity-75">
      <span
        className={`h-px w-3.5 ${
          active ? "bg-[#8A8F76]" : "bg-[#91885D]/40"
        }`}
      />
      <svg
        className={`w-2.5 h-2.5 ${
          active ? "text-[#787D64]" : "text-[#91885D]"
        }`}
        viewBox="0 0 10 10"
        fill="currentColor"
      >
        <path d="M1 9 C4 7, 7 4, 9 1 C6 3, 3 6, 1 9 Z" />
      </svg>
      <span
        className={`h-px w-3.5 ${
          active ? "bg-[#8A8F76]" : "bg-[#91885D]/40"
        }`}
      />
    </div>
  );
}

interface MenuSectionProps {
  slug?: string;
}

export function MenuSection({ slug = "the-indulgent-spoon" }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("popular");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── LIVE DATA FROM SUPABASE (with fallback to hardcoded) ──
  const [liveCategories, setLiveCategories] = useState<CategoryCard[]>([]);
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Fetch live products & categories from Supabase
  useEffect(() => {
    let cancelled = false;

    function unpackMeta(p: any): Product {
      const item = { ...p };
      if (item.description && typeof item.description === "string" && item.description.includes("<!-- BAKERY_META:")) {
        try {
          const match = item.description.match(/<!-- BAKERY_META:([\s\S]*?) -->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (!item.gallery_images || item.gallery_images.length === 0) item.gallery_images = meta.gallery_images;
            if (!item.sizes || item.sizes.length === 0) item.sizes = meta.sizes;
            if (!item.addons || item.addons.length === 0) item.addons = meta.addons;
            if (!item.tags || item.tags.length === 0) item.tags = meta.tags;
            if (!item.story_text) item.story_text = meta.story_text;
            if (!item.badge) item.badge = meta.badge;
          }
          item.description = item.description.replace(/<!-- BAKERY_META:([\s\S]*?) -->/, "").trim();
        } catch {
          // ignore
        }
      }
      return item;
    }

    async function fetchLiveData() {
      try {
        const supabase = createClient();

        // Find the restaurant (by slug or first available)
        const defaultSlug =
          process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || "the-indulgent-spoon";
        let { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("slug", defaultSlug)
          .maybeSingle();

        if (!restaurant) {
          const { data: firstRest } = await supabase
            .from("restaurants")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          restaurant = firstRest;
        }

        if (!restaurant || cancelled) return;

        // Fetch categories and products in parallel
        const [catRes, prodRes] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("restaurant_id", restaurant.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("products")
            .select("*")
            .eq("restaurant_id", restaurant.id)
            .eq("available", true)
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;

        const dbCategories = (catRes.data || []) as Category[];
        const rawProducts = (prodRes.data || []) as Product[];
        const dbProducts = rawProducts.map(unpackMeta);

        if (dbProducts.length > 0 || dbCategories.length > 0) {
          // Build category cards from DB categories
          const categoryCards: CategoryCard[] = [
            {
              id: "popular",
              name: "Popular",
              count: `${dbProducts.filter((p) => p.featured).length || dbProducts.length} items`,
              image:
                dbProducts.find((p) => p.featured)?.image_url ||
                dbProducts[0]?.image_url ||
                "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80",
            },
          ];

          for (const cat of dbCategories) {
            const catProducts = dbProducts.filter(
              (p) => p.category_id === cat.id
            );
            const coverImage =
              cat.image_url ||
              catProducts[0]?.image_url ||
              (catProducts[0]?.gallery_images && catProducts[0]?.gallery_images[0]) ||
              "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80";

            categoryCards.push({
              id: cat.id,
              name: cat.name,
              count: `${catProducts.length} items`,
              image: coverImage,
            });
          }

          // Also include products with no category under an "Other" tab if needed
          const uncategorized = dbProducts.filter(
            (p) => !p.category_id || !dbCategories.find((c) => c.id === p.category_id)
          );
          if (uncategorized.length > 0 && dbCategories.length > 0) {
            categoryCards.push({
              id: "other",
              name: "Other",
              count: `${uncategorized.length} items`,
              image:
                uncategorized[0]?.image_url ||
                "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80",
            });
          }

          // Build menu items from DB products
          const menuItems: MenuItem[] = dbProducts.map((p) => {
            const cat = dbCategories.find((c) => c.id === p.category_id);
            const categorySlug = cat ? cat.id : "other";

            const pGallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
            const primaryImg = p.image_url || (pGallery.length > 0 ? pGallery[0] : "") ||
              "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80";

            return {
              id: p.id,
              name: p.name,
              price: Number(p.price),
              description: p.description || "",
              category: categorySlug,
              isPopular: p.featured,
              badge: (p.badge as MenuItem["badge"]) || undefined,
              tags: p.tags || [],
              image: primaryImg,
              doodleText: p.story_text || undefined,
              hasChefHat: false,
            };
          });

          if (!cancelled) {
            setLiveCategories(categoryCards);
            setLiveMenuItems(menuItems);
            setDbLoaded(true);
          }
        }
      } catch (err) {
        console.warn("MenuSection: Could not fetch live data, using defaults", err);
      }
    }

    fetchLiveData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Use live data if loaded, otherwise fallback to hardcoded constants
  const activeCategoryCards = dbLoaded && liveCategories.length > 0 ? liveCategories : CATEGORY_CARDS;
  const activeMenuItems = dbLoaded && liveMenuItems.length > 0 ? liveMenuItems : MENU_ITEMS;

  // Listen to cross-component category selection events (e.g. from WhatWeSellSection)
  useEffect(() => {
    const handleSelectCategory = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const cat = customEvent.detail;
      if (cat) {
        // If category from WhatWeSell is a name-based slug, try to find matching live category
        const matchingLiveCat = activeCategoryCards.find(
          (c) => c.name.toLowerCase().replace(/\s+/g, "-") === cat || c.id === cat
        );
        setActiveCategory(matchingLiveCat ? matchingLiveCat.id : cat);
        const el = document.getElementById("menu");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    window.addEventListener("select-category", handleSelectCategory);
    return () => {
      window.removeEventListener("select-category", handleSelectCategory);
    };
  }, [activeCategoryCards]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const filteredItems =
    activeCategory === "popular"
      ? activeMenuItems.filter((item) => item.isPopular)
      : activeMenuItems.filter((item) => item.category === activeCategory);

  const displayItems =
    filteredItems.length > 0
      ? filteredItems
      : activeMenuItems.filter((item) => item.isPopular).length > 0
      ? activeMenuItems.filter((item) => item.isPopular)
      : activeMenuItems.slice(0, 6);

  const getQty = (id: string) => (quantities[id] !== undefined ? quantities[id] : 1);

  const {
    addItem,
    decrement,
    increment,
    items: cartItems,
    getProductQuantity,
  } = useCart();

  const handleIncrement = (id: string) => {
    const inCartCount = getProductQuantity(id);
    if (inCartCount > 0) {
      const cartItem = cartItems.find(
        (ci) => ci.product.id === id || ci.id.startsWith(id)
      );
      if (cartItem) {
        increment(cartItem.id);
      } else {
        const item = activeMenuItems.find((i) => i.id === id);
        if (item) {
          addItem(
            {
              id: item.id,
              restaurant_id: "default",
              name: item.name,
              description: item.description,
              price: item.price,
              image_url: item.image,
              available: true,
              featured: true,
              category_id: null,
              sort_order: 0,
            },
            1
          );
        }
      }
    } else {
      setQuantities((prev) => ({
        ...prev,
        [id]: (prev[id] !== undefined ? prev[id] : 1) + 1,
      }));
    }
  };

  const handleDecrement = (id: string) => {
    const inCartCount = getProductQuantity(id);
    if (inCartCount > 0) {
      const cartItem = cartItems.find(
        (ci) => ci.product.id === id || ci.id.startsWith(id)
      );
      if (cartItem) {
        // If 1 in cart, decrement removes it from cart, automatically switching button back to "Add to Cart"
        decrement(cartItem.id);
        if (inCartCount <= 1) {
          setQuantities((prev) => ({ ...prev, [id]: 1 }));
        }
      }
    } else {
      // Allow decreasing to 0
      setQuantities((prev) => ({
        ...prev,
        [id]: Math.max(0, (prev[id] !== undefined ? prev[id] : 1) - 1),
      }));
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddToCart = (item: MenuItem) => {
    const inCartCount = getProductQuantity(item.id);
    const qty = getQty(item.id);
    const qtyToAdd = inCartCount > 0 ? 1 : Math.max(1, qty);

    addItem(
      {
        id: item.id,
        restaurant_id: "default",
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image,
        available: true,
        featured: true,
        category_id: null,
        sort_order: 0,
      },
      qtyToAdd
    );

    setAddedItem(item.id);
    setTimeout(() => {
      setAddedItem(null);
    }, 1400);
  };

  return (
    <section
      id="menu"
      className="relative overflow-hidden bg-[#F4E9DC] py-10 sm:py-16 lg:py-20 text-[#29251F]"
    >
      {/* Vintage subtle ambient background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#FFF9F0_0%,rgba(244,233,220,0.4)_60%,rgba(217,188,158,0.25)_100%)]" />



      <div className="relative mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
        {/* ── HEADER ROW WITH VINTAGE CALLOUTS ── */}
        <div className="relative mb-6 sm:mb-9 flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
          {/* Left: Heading & Subheading */}
          <div className="max-w-xl">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#7A6F5D] block mb-1 sm:mb-2">
              OUR MENU
            </span>
            <h2 className="font-serif text-[1.75rem] sm:text-4xl lg:text-[3.25rem] font-bold text-[#29251F] leading-[1.12] tracking-tight">
              Made With a Lot <br />
              <span className="relative inline-flex items-center gap-2 sm:gap-3">
                of Love & Butter!
                <svg
                  className="w-5 h-5 sm:w-8 sm:h-8 text-[#A34B3D] inline-block -rotate-6 transform"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 26 C12 22, 4 16, 4 9.5 A 6 6 0 0 1 16 7.5 A 6 6 0 0 1 28 9.5 C28 16, 20 22, 16 26 Z" />
                </svg>
              </span>
            </h2>
            <p className="mt-2 sm:mt-3.5 text-xs sm:text-base text-[#6B6152] font-medium tracking-wide">
              Freshly baked. Honestly indulgent. Always special.
            </p>
          </div>

          {/* Right: Handwritten note & circular stamp */}
          <div className="flex items-center justify-end gap-3 sm:gap-8 self-end md:self-center -mt-2 sm:mt-0">
            {/* Calligraphic script note */}
            <div className="flex flex-col items-center -rotate-6 select-none">
              <span
                className="text-xs sm:text-lg text-[#85725A] italic font-serif leading-tight font-medium"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Good Desserts
              </span>
              <span
                className="text-[10px] sm:text-base text-[#85725A] italic font-serif leading-tight font-medium"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Happier Days
              </span>
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#85725A] mt-0.5 opacity-80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M12 21 C9 18, 3 13, 3 8 A 4.5 4.5 0 0 1 12 6.5 A 4.5 4.5 0 0 1 21 8 C21 13, 15 18, 12 21 Z" />
              </svg>
            </div>

            {/* Circular stamp badge */}
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full border border-dashed border-[#85725A]/40 bg-[#FAF4EC]/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-1.5 sm:p-2 shadow-2xs select-none">
              <span className="text-[7px] sm:text-[9px] font-semibold uppercase tracking-wider text-[#7A6A54] leading-[1.15]">
                SWEET
              </span>
              <span className="text-[7px] sm:text-[9px] font-semibold uppercase tracking-wider text-[#7A6A54] leading-[1.15]">
                THINGS
              </span>
              <span className="text-[7px] sm:text-[9px] font-semibold uppercase tracking-wider text-[#7A6A54] leading-[1.15]">
                BRIGHTER
              </span>
              <span className="text-[7px] sm:text-[9px] font-semibold uppercase tracking-wider text-[#7A6A54] leading-[1.15]">
                PEOPLE
              </span>
              <span className="text-[8px] sm:text-[10px] text-[#A34B3D] mt-0.5 leading-none">♡</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── SMOOTH HORIZONTAL SLIDE CATEGORY CARDS ────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="relative mb-8 sm:mb-12 group/slider">
          {/* Left Arrow Button */}
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#FAF5ED] border border-[#D8CABE] shadow-md items-center justify-center text-[#554D3D] hover:bg-[#F3EFE4] hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#FAF5ED] border border-[#D8CABE] shadow-md items-center justify-center text-[#554D3D] hover:bg-[#F3EFE4] hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scrollable Container with ample right padding so Gift Boxes is never cut off */}
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto pb-4 pt-1 px-1 sm:px-2 scrollbar-none scroll-smooth -mx-3.5 sm:mx-0 pr-10 sm:pr-8"
          >
            {activeCategoryCards.map((cat, index) => {
              const isActive = activeCategory === cat.id;

              return (
                <div key={cat.id} className="relative flex items-center shrink-0">
                  {/* Connecting diamond accent between cards */}
                  {index > 0 && (
                    <span className="absolute -left-1.5 sm:-left-2 z-10 text-[7px] sm:text-[8px] text-[#C48473] select-none pointer-events-none opacity-80">
                      ◆
                    </span>
                  )}

                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`group relative flex flex-col items-center justify-between w-[92px] sm:w-[104px] md:w-[112px] pt-3 pb-2.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-[#F3EFE4] border-2 border-[#8A8F76] shadow-[0_4px_16px_rgba(138,143,118,0.22)] scale-[1.02]"
                        : "bg-[#FAF5ED]/95 border border-[#E7DCCE]/80 hover:border-[#8A8F76]/50 hover:bg-[#F6EFE3] hover:shadow-xs shadow-[0_1px_4px_rgba(41,37,31,0.03)]"
                    }`}
                  >
                    {/* Top Circular Image */}
                    <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-full p-0.5 flex items-center justify-center mb-1">
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#E8DDD0]/70 border border-[#D8CABE]/50 shadow-inner">
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          sizes="65px"
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                    </div>

                    {/* Category Name */}
                    <h4
                      className={`font-serif text-[12.5px] sm:text-sm font-semibold tracking-tight transition-colors leading-tight text-center ${
                        isActive
                          ? "text-[#29251F] font-bold"
                          : "text-[#3D362C] group-hover:text-[#29251F]"
                      }`}
                    >
                      {cat.name}
                    </h4>

                    {/* Leaf Divider */}
                    <LeafDivider active={isActive} />

                    {/* Item Count */}
                    <span
                      className={`text-[10px] sm:text-[10.5px] tracking-wide transition-colors ${
                        isActive
                          ? "text-[#5E5546] font-medium"
                          : "text-[#7D7363]"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── MOBILE VIEW: HORIZONTAL CARD SPLIT (md:hidden) ── */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 md:hidden">
          {displayItems.map((item) => {
            const qty = getQty(item.id);
            const isJustAdded = addedItem === item.id;
            const inCartCount = getProductQuantity(item.id);
            const isAlreadyInCart = inCartCount > 0;

            return (
              <div
                key={`mobile-${item.id}`}
                className="flex flex-row rounded-2xl bg-[#FAF4EB] border border-[#E5D7C6] overflow-hidden shadow-[0_2px_10px_rgba(41,37,31,0.05)] transition-all"
              >
                {/* Left Side: Product Image (42% width) */}
                <Link
                  href={`/store/${slug}/product/${item.id}`}
                  className="relative w-[42%] shrink-0 overflow-hidden bg-[#EFE5D7] block cursor-pointer group"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="45vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* In Cart Indicator */}
                  {isAlreadyInCart && (
                    <div className="absolute top-2 right-2 z-10 animate-in fade-in zoom-in-75">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-white bg-[#4D7C47] shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>{inCartCount} in Cart</span>
                      </span>
                    </div>
                  )}

                  {/* Top-Left Badges */}
                  {item.badge && item.badge !== "NONE" && (
                    <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
                      {item.badge
                        .split(",")
                        .map((b) => b.trim())
                        .filter((b) => b && b !== "NONE")
                        .map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider text-white shadow-xs ${
                              b === "BESTSELLER"
                                ? "bg-[#8E2822]"
                                : b === "POPULAR"
                                ? "bg-[#A33D31]"
                                : b === "CHEF'S PICK"
                                ? "bg-[#B4832E]"
                                : b === "SUGAR FREE"
                                ? "bg-[#0E7490]"
                                : b === "GLUTEN FREE"
                                ? "bg-[#15803D]"
                                : "bg-[#B04336]"
                            }`}
                          >
                            {b}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Chalk / Calligraphy script overlay at bottom right of image */}
                  {item.doodleText && (
                    <div className="absolute bottom-2 right-2 text-right pointer-events-none z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      <span
                        className="text-[11px] font-serif italic text-white/95 leading-none block -rotate-6"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {item.doodleText}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Right Side: Product Details & Controls (58% width) */}
                <div className="w-[58%] p-3 flex flex-col justify-between">
                  <div>
                    {/* Header Row: Title & Veg Icon */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {item.hasChefHat && (
                          <ChefHat className="w-3.5 h-3.5 text-[#85725A] shrink-0 mt-0.5" />
                        )}
                        <Link
                          href={`/store/${slug}/product/${item.id}`}
                          className="hover:text-[#A34B3D] transition-colors"
                        >
                          <h3 className="font-serif text-sm font-bold text-[#29251F] leading-tight line-clamp-2">
                            {item.name}
                          </h3>
                        </Link>
                      </div>
                      <VegSymbol className="w-3.5 h-3.5 mt-0.5" />
                    </div>

                    {/* Description */}
                    <p className="mt-1 text-[11px] text-[#706657] leading-snug line-clamp-2">
                      {item.description}
                    </p>

                    {/* Tags */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded-[4px] bg-[#EFE8DC] text-[#695F52] text-[9px] font-medium leading-none"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Row: Price + Stepper + Add Button */}
                  <div className="mt-3 pt-2 border-t border-[#EAE0D1] flex items-center justify-between gap-1">
                    {/* Price */}
                    <span className="font-serif text-sm font-bold text-[#29251F] whitespace-nowrap">
                      ₹{item.price}
                    </span>

                    {/* Stepper */}
                    <div className="flex items-center rounded-lg bg-[#EFE8DC] px-1.5 py-0.5 border border-[#E2D6C6]">
                      <button
                        onClick={() => handleDecrement(item.id)}
                        className="p-0.5 text-[#695F52] hover:text-[#29251F] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2} />
                      </button>
                      <span className="w-4 text-center text-[11px] font-bold text-[#29251F]">
                        {inCartCount > 0 ? inCartCount : qty}
                      </span>
                      <button
                        onClick={() => handleIncrement(item.id)}
                        className="p-0.5 text-[#695F52] hover:text-[#29251F] cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>

                    {/* Add Button with In-Cart State */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap ${
                        isJustAdded
                          ? "bg-[#4D7C47] text-white"
                          : isAlreadyInCart
                          ? "bg-[#5D6B3F] hover:bg-[#4E5B33] text-white"
                          : "bg-[#A34B3D] hover:bg-[#8F3F32] text-white active:scale-95"
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                          <span>Added!</span>
                        </>
                      ) : isAlreadyInCart ? (
                        <>
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                          <span>In Cart ({inCartCount}) +</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3 h-3" strokeWidth={2} />
                          <span>Add +</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── DESKTOP VIEW: 3-COLUMN GRID (hidden md:grid) ──── */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {displayItems.map((item) => {
            const isFav = !!favorites[item.id];
            const qty = getQty(item.id);
            const isJustAdded = addedItem === item.id;
            const inCartCount = getProductQuantity(item.id);
            const isAlreadyInCart = inCartCount > 0;

            return (
              <div
                key={`desktop-${item.id}`}
                className="group flex flex-col rounded-3xl bg-[#FAF5ED] border border-[#E7DCCE] p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(41,37,31,0.04)] hover:shadow-[0_8px_24px_rgba(41,37,31,0.08)] hover:border-[#D4C3AE] transition-all duration-300"
              >
                {/* Image Container */}
                <Link
                  href={`/store/${slug}/product/${item.id}`}
                  className="relative aspect-4/3 sm:aspect-[1.18/1] w-full overflow-hidden rounded-2xl bg-[#EFE5D7] block cursor-pointer"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* In Cart Indicator Ribbon/Badge */}
                  {isAlreadyInCart && (
                    <div className="absolute top-3 left-3 z-20 animate-in fade-in zoom-in-75">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-[#4D7C47] shadow-sm border border-white/20">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{inCartCount} in Cart</span>
                      </span>
                    </div>
                  )}

                  {/* Top-Left Badge (POPULAR or NEW!) */}
                  {item.badge && !isAlreadyInCart && (
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-xs ${
                          item.badge === "POPULAR"
                            ? "bg-[#A33D31]"
                            : "bg-[#B04336]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  )}

                  {/* Top-Right Wishlist / Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/40 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                    aria-label="Add to favorites"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isFav ? "fill-[#E04D3E] text-[#E04D3E]" : "text-white"
                      }`}
                      strokeWidth={1.8}
                    />
                  </button>

                  {/* Doodle Script */}
                  {item.doodleText && (
                    <div className="absolute bottom-3 right-3 text-right pointer-events-none z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      <span
                        className="text-xs font-serif italic text-white/95 leading-none block -rotate-6"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {item.doodleText}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Card Body */}
                <div className="flex flex-1 flex-col pt-4 px-1 pb-1">
                  {/* Title & Price Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.hasChefHat && (
                        <ChefHat className="w-4 h-4 text-[#85725A] shrink-0" />
                      )}
                      <Link
                        href={`/store/${slug}/product/${item.id}`}
                        className="hover:text-[#A34B3D] transition-colors"
                      >
                        <h3 className="font-serif text-base sm:text-[1.125rem] font-bold text-[#29251F] leading-snug">
                          {item.name}
                        </h3>
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-serif text-base sm:text-lg font-bold text-[#29251F] whitespace-nowrap">
                        ₹{item.price}
                      </span>
                      <VegSymbol className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-1.5 text-xs sm:text-sm text-[#706657] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Tags Row */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-md bg-[#EFE8DC] text-[#695F52] text-[10px] sm:text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Bottom Action Row: Stepper + Add to Cart */}
                  <div className="mt-auto pt-4 flex items-center gap-2.5">
                    {/* Stepper */}
                    <div className="flex items-center rounded-xl bg-[#EFE8DC] px-2 py-1.5 border border-[#E2D6C6]">
                      <button
                        onClick={() => handleDecrement(item.id)}
                        className="p-1 text-[#695F52] hover:text-[#29251F] transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#29251F]">
                        {inCartCount > 0 ? inCartCount : qty}
                      </span>
                      <button
                        onClick={() => handleIncrement(item.id)}
                        className="p-1 text-[#695F52] hover:text-[#29251F] transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-xs ${
                        isJustAdded
                          ? "bg-[#4D7C47] text-white"
                          : isAlreadyInCart
                          ? "bg-[#5D6B3F] hover:bg-[#4E5B33] text-white"
                          : "bg-[#A34B3D] hover:bg-[#8F3F32] text-white active:scale-[0.98]"
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                          <span>Added!</span>
                        </>
                      ) : isAlreadyInCart ? (
                        <>
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                          <span>In Cart ({inCartCount}) • Add More</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" strokeWidth={2} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Catalog Link */}
        <div className="mt-8 sm:mt-12 text-center">
          <Link
            href="/#menu"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-[#A34B3D] hover:text-[#82382D] transition-colors group"
          >
            <span>Explore Complete Kitchen Menu</span>
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
