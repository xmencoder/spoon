"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import {
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
} from "lucide-react";
import { useCart } from "@/lib/store/CartContext";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types/database";
import { parseBadges, getBadgeColorClass } from "@/lib/badges";
import { getCategoryRemainingStock } from "@/app/store/[slug]/actions";

export interface CategoryCard {
  id: string;
  name: string;
  count: string;
  image: string;
}

export const CATEGORY_CARDS: CategoryCard[] = [];

export function buildCategoryCardsAndMenuItems(
  dbCategories: Category[],
  dbProducts: Product[]
): { categoryCards: CategoryCard[]; menuItems: MenuItem[] } {
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
    const catProducts = dbProducts.filter((p) => p.category_id === cat.id);
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

  const menuItems: MenuItem[] = dbProducts.map((p) => {
    const cat = dbCategories.find((c) => c.id === p.category_id);
    const categorySlug = cat ? cat.id : "other";

    const pGallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
    const primaryImg =
      p.image_url ||
      (pGallery.length > 0 ? pGallery[0] : "") ||
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

  return { categoryCards, menuItems };
}

// Global in-memory cache to ensure instant, seamless switching between Home & Menu
let globalCachedCategories: CategoryCard[] = [];
let globalCachedMenuItems: MenuItem[] = [];
let globalCachedDbProducts: Product[] = [];
let globalCachedRestaurantId: string = "";
let globalDbLoaded = false;

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

const MENU_ITEMS: MenuItem[] = [];

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
  isFullMenu?: boolean;
  initialRestaurantId?: string;
  initialCategories?: Category[];
  initialProducts?: Product[];
}

export function MenuSection({
  slug = "the-indulgent-spoon",
  isFullMenu = false,
  initialRestaurantId,
  initialCategories,
  initialProducts,
}: MenuSectionProps) {
  // If initial props provided from server and cache empty, seed cache immediately
  if (
    initialCategories &&
    initialProducts &&
    initialProducts.length > 0 &&
    !globalDbLoaded
  ) {
    const { categoryCards, menuItems } = buildCategoryCardsAndMenuItems(
      initialCategories,
      initialProducts
    );
    globalCachedRestaurantId = initialRestaurantId || "";
    globalCachedDbProducts = initialProducts;
    globalCachedCategories = categoryCards;
    globalCachedMenuItems = menuItems;
    globalDbLoaded = true;
  }
  const [activeCategory, setActiveCategory] = useState<string>("popular");
  const [activeSectionId, setActiveSectionId] = useState<string>("popular");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isManualScrolling = useRef(false);
  const manualScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  // Ensures the initial hash/query scroll happens only once per page load
  const hasScrolledToInitialTarget = useRef(false);

  // ── LIVE DATA FROM SUPABASE (persisted in global cache) ──
  const [liveCategories, setLiveCategories] = useState<CategoryCard[]>(() => {
    if (globalDbLoaded && globalCachedCategories.length > 0) return globalCachedCategories;
    if (initialCategories && initialProducts && initialProducts.length > 0) {
      const { categoryCards } = buildCategoryCardsAndMenuItems(initialCategories, initialProducts);
      return categoryCards;
    }
    return [];
  });

  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>(() => {
    if (globalDbLoaded && globalCachedMenuItems.length > 0) return globalCachedMenuItems;
    if (initialCategories && initialProducts && initialProducts.length > 0) {
      const { menuItems } = buildCategoryCardsAndMenuItems(initialCategories, initialProducts);
      return menuItems;
    }
    return [];
  });

  const [liveDbProducts, setLiveDbProducts] = useState<Product[]>(() => {
    if (globalDbLoaded && globalCachedDbProducts.length > 0) return globalCachedDbProducts;
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return [];
  });

  const [restaurantId, setRestaurantId] = useState<string>(() => {
    return globalCachedRestaurantId || initialRestaurantId || "";
  });

  const [dbLoaded, setDbLoaded] = useState<boolean>(() => {
    return globalDbLoaded || (!!initialProducts && initialProducts.length > 0);
  });

  // Category order-limit remaining stock map: catId → { limit, totalOrdered, remaining }
  const [catStockMap, setCatStockMap] = useState<
    Record<string, { limit: number; totalOrdered: number; remaining: number }>
  >({});

  useEffect(() => {
    const restId = restaurantId || globalCachedRestaurantId || initialRestaurantId;
    if (restId) {
      getCategoryRemainingStock(restId).then((map) => setCatStockMap(map));
    }
  }, [restaurantId, initialRestaurantId]);

  /** Returns true if the product's category has a limit that's been fully used up */
  const isProductCatSoldOut = useCallback((itemId: string): boolean => {
    const dbProd = liveDbProducts.find((p) => p.id === itemId);
    if (!dbProd || !dbProd.category_id) return false;
    const stock = catStockMap[dbProd.category_id];
    return stock != null && stock.remaining <= 0;
  }, [liveDbProducts, catStockMap]);

  /** Returns remaining count for an item's category (null = no limit or not near limit) */
  const getProductCatRemaining = useCallback((itemId: string): number | null => {
    const dbProd = liveDbProducts.find((p) => p.id === itemId);
    if (!dbProd || !dbProd.category_id) return null;
    const stock = catStockMap[dbProd.category_id];
    if (!stock || stock.remaining <= 0 || stock.remaining > 5) return null;
    return stock.remaining;
  }, [liveDbProducts, catStockMap]);

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
          const { categoryCards, menuItems } = buildCategoryCardsAndMenuItems(
            dbCategories,
            dbProducts
          );

          if (!cancelled) {
            globalCachedRestaurantId = restaurant.id;
            globalCachedDbProducts = dbProducts;
            globalCachedCategories = categoryCards;
            globalCachedMenuItems = menuItems;
            globalDbLoaded = true;

            setRestaurantId(restaurant.id);
            setLiveDbProducts(dbProducts);
            setLiveCategories(categoryCards);
            setLiveMenuItems(menuItems);
            setDbLoaded(true);
          }
        }
      } catch (err) {
        console.warn("MenuSection: Could not fetch live data, using defaults", err);
      }
    }

    // Skip network fetch if cache is already populated from SSR initial props.
    // The SSR data is already filtered (available=true) and is the ground truth.
    // This prevents a visible re-render flash caused by a redundant client fetch.
    if (globalDbLoaded && globalCachedMenuItems.length > 0) {
      return () => { cancelled = true; };
    }

    fetchLiveData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Use live data (persisted in module cache)
  const baseCategoryCards = liveCategories;
  const activeMenuItems = liveMenuItems;

  // Categories order: First "Popular", then rest of categories in order
  const popularCard = baseCategoryCards.find((c) => c.id === "popular");
  const otherCategoryCards = baseCategoryCards.filter(
    (c) => c.id !== "popular" && c.id !== "all"
  );
  const activeCategoryCards: CategoryCard[] = [
    ...(popularCard ? [popularCard] : []),
    ...otherCategoryCards,
  ];

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

  const filteredItems = (() => {
    if (activeCategory === "all") {
      return activeMenuItems;
    }
    if (activeCategory === "popular") {
      const popularItems = activeMenuItems.filter((item) => item.isPopular);
      if (dbLoaded && liveDbProducts.length > 0) {
        // Sort by popular_rank from the live DB product
        return [...popularItems].sort((a, b) => {
          const rankA = liveDbProducts.find((p) => p.id === a.id)?.popular_rank ?? 999;
          const rankB = liveDbProducts.find((p) => p.id === b.id)?.popular_rank ?? 999;
          return rankA - rankB;
        });
      }
      return popularItems;
    }
    return activeMenuItems.filter((item) => item.category === activeCategory);
  })();

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

  const canIncrementItem = useCallback(
    (itemId: string): boolean => {
      const dbProd = liveDbProducts.find(
        (p) => p.id === itemId || p.name.trim().toLowerCase() === itemId.trim().toLowerCase()
      );
      if (!dbProd || !dbProd.category_id) return true;
      const stock = catStockMap[dbProd.category_id];
      if (!stock) return true;
      if (stock.remaining <= 0) return false;

      const inCartCatQty = cartItems
        .filter((ci) => {
          const lp = liveDbProducts.find(
            (p) => p.id === ci.product?.id
          );
          return (
            lp?.category_id === dbProd.category_id ||
            ci.product?.category_id === dbProd.category_id
          );
        })
        .reduce((sum, ci) => sum + ci.quantity, 0);

      const inCartProdQty = getProductQuantity(itemId);
      const localQty = quantities[itemId] !== undefined ? quantities[itemId] : 1;
      return inCartProdQty > 0
        ? inCartCatQty < stock.remaining
        : inCartCatQty + localQty < stock.remaining;
    },
    [liveDbProducts, catStockMap, cartItems, getProductQuantity, quantities]
  );

  const handleIncrement = (id: string) => {
    if (isProductCatSoldOut(id)) return;
    if (!canIncrementItem(id)) return;
    const inCartCount = getProductQuantity(id);
    if (inCartCount > 0) {
      const cartItem = cartItems.find(
        (ci) =>
          ci.product?.id === id ||
          ci.id === id ||
          ci.id.startsWith(`${id}__`) ||
          (ci.id.startsWith(`${id}-`) && ci.product?.id === id)
      );
      if (cartItem) {
        increment(cartItem.id);
      } else {
        const item = activeMenuItems.find((i) => i.id === id);
        if (item) {
          handleAddToCart(item);
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
        (ci) =>
          ci.product?.id === id ||
          ci.id === id ||
          ci.id.startsWith(`${id}__`) ||
          (ci.id.startsWith(`${id}-`) && ci.product?.id === id)
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

  const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    if (isProductCatSoldOut(item.id)) return;
    const matchingDbProduct = liveDbProducts.find(
      (p) => p.id === item.id || p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
    const catId = matchingDbProduct?.category_id;
    if (catId && catStockMap[catId]) {
      const stock = catStockMap[catId];
      const inCartCatQty = cartItems
        .filter((ci) => {
          const lp = liveDbProducts.find(
            (p) => p.id === ci.product?.id
          );
          return (
            lp?.category_id === catId ||
            ci.product?.category_id === catId
          );
        })
        .reduce((sum, ci) => sum + ci.quantity, 0);
      const inCartCount = getProductQuantity(item.id);
      const qty = getQty(item.id);
      const qtyToAdd = inCartCount > 0 ? 1 : Math.max(1, qty);
      if (inCartCatQty + qtyToAdd > stock.remaining) {
        return;
      }
    }

    const inCartCount = getProductQuantity(item.id);
    const qty = getQty(item.id);
    const qtyToAdd = inCartCount > 0 ? 1 : Math.max(1, qty);

    const productPayload: Product = matchingDbProduct
      ? {
          ...matchingDbProduct,
          price: Number(item.price || matchingDbProduct.price),
        }
      : {
          id: item.id,
          restaurant_id: restaurantId || "the-indulgent-spoon",
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image,
          available: true,
          featured: item.isPopular ?? true,
          category_id:
            item.category !== "popular" && item.category !== "other"
              ? item.category
              : null,
          sort_order: 0,
        };

    addItem(productPayload, qtyToAdd, undefined, e);

    setAddedItem(item.id);
    setTimeout(() => {
      setAddedItem(null);
    }, 1400);
  };

  // Close drawer when body scroll-lock should be applied
  useEffect(() => {
    if (isCategoryDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCategoryDrawerOpen]);

  const getCategoryItems = useCallback(
    (catId: string): MenuItem[] => {
      if (catId === "popular") {
        const popularItems = activeMenuItems.filter((item) => item.isPopular);
        if (dbLoaded && liveDbProducts.length > 0) {
          return [...popularItems].sort((a, b) => {
            const rankA = liveDbProducts.find((p) => p.id === a.id)?.popular_rank ?? 999;
            const rankB = liveDbProducts.find((p) => p.id === b.id)?.popular_rank ?? 999;
            return rankA - rankB;
          });
        }
        return popularItems;
      }
      return activeMenuItems.filter(
        (item) =>
          item.category === catId ||
          item.category.toLowerCase() === catId.toLowerCase() ||
          item.category.toLowerCase().replace(/\s+/g, "-") === catId.toLowerCase()
      );
    },
    [activeMenuItems, dbLoaded, liveDbProducts]
  );

  const categorySections = useMemo(() => {
    if (!isFullMenu) return [];

    const sections: Array<{
      id: string;
      name: string;
      items: MenuItem[];
    }> = [];

    // 1. Popular first
    const popularItems = getCategoryItems("popular");
    if (popularItems.length > 0) {
      sections.push({
        id: "popular",
        name: "Popular",
        items: popularItems,
      });
    }

    // 2. Next: other categories in order
    for (const cat of activeCategoryCards) {
      if (cat.id === "popular" || cat.id === "all") continue;
      const items = getCategoryItems(cat.id);
      if (items.length > 0) {
        sections.push({
          id: cat.id,
          name: cat.name,
          items,
        });
      }
    }

    return sections;
  }, [isFullMenu, activeCategoryCards, getCategoryItems]);

  // Scroll tabs container horizontally to center the active tab — WITHOUT touching page scroll
  const scrollTabIntoView = (id: string) => {
    const tabEl = tabRefs.current[id];
    const container = tabsContainerRef.current;
    if (tabEl && container) {
      const tabLeft = tabEl.offsetLeft;
      const tabWidth = tabEl.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScrollLeft = tabLeft - containerWidth / 2 + tabWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
    }
  };

  const scrollToCategorySection = (id: string) => {
    setActiveSectionId(id);
    isManualScrolling.current = true;
    if (manualScrollTimeout.current) clearTimeout(manualScrollTimeout.current);

    const el = document.getElementById(`section-${id}`);
    if (el) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const yOffset = isMobile ? -231 : -251;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }

    scrollTabIntoView(id);

    // Unlock scroll after smooth scroll completes — 800ms is enough for the animation
    manualScrollTimeout.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 800);
  };

  // Allow user touch/wheel to instantly cancel programmatic scrolling
  const cancelProgrammaticScroll = () => {
    if (isManualScrolling.current) {
      isManualScrolling.current = false;
      if (manualScrollTimeout.current) {
        clearTimeout(manualScrollTimeout.current);
        manualScrollTimeout.current = null;
      }
    }
  };

  // Scroll Spy for Full Menu: auto update active category when scrolling (Mobile & Desktop)
  useEffect(() => {
    if (!isFullMenu || categorySections.length === 0) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;

      const isMobile = window.innerWidth < 768;
      const scrollPosition = window.scrollY + (isMobile ? 251 : 271);

      let currentId = categorySections[0].id;
      for (const sec of categorySections) {
        const el = document.getElementById(`section-${sec.id}`);
        if (el) {
          if (scrollPosition >= el.offsetTop) {
            currentId = sec.id;
          }
        }
      }

      setActiveSectionId((prev) => {
        if (prev !== currentId) {
          scrollTabIntoView(currentId);
          return currentId;
        }
        return prev;
      });
    };

    // Cancel programmatic scroll when user manually scrolls or touches
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", cancelProgrammaticScroll, { passive: true });
    window.addEventListener("touchmove", cancelProgrammaticScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", cancelProgrammaticScroll);
      window.removeEventListener("touchmove", cancelProgrammaticScroll);
      if (manualScrollTimeout.current) clearTimeout(manualScrollTimeout.current);
    };
  }, [isFullMenu, categorySections]);

  // Handle initial category target from URL hash or query param — fires only ONCE per page load
  useEffect(() => {
    if (!isFullMenu || categorySections.length === 0) return;
    // Guard: only execute the initial scroll once, even if categorySections updates later
    if (hasScrolledToInitialTarget.current) return;

    const hash = window.location.hash?.replace("#section-", "").replace("#", "");
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("category") || hash;
    if (!targetId) return;

    const match = categorySections.find(
      (s) =>
        s.id.toLowerCase() === targetId.toLowerCase() ||
        s.name.toLowerCase().replace(/\s+/g, "-") === targetId.toLowerCase()
    );
    if (match) {
      // Mark as done BEFORE scrolling so any re-render of categorySections won't re-trigger
      hasScrolledToInitialTarget.current = true;
      setTimeout(() => {
        scrollToCategorySection(match.id);
        // Remove hash from URL after scrolling so it won't fight native anchor behavior
        if (window.location.hash) {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }, 300);
    }
  }, [isFullMenu, categorySections]);

  const handleSelectCategoryFromDrawer = (catId: string) => {
    setIsCategoryDrawerOpen(false);
    setTimeout(() => {
      if (isFullMenu) {
        scrollToCategorySection(catId);
      } else {
        window.location.href = `/full-menu#section-${catId}`;
      }
    }, 250);
  };

  return (
    <section
      id="menu"
      className="relative overflow-hidden bg-[#F4E9DC] py-10 sm:py-16 lg:py-20 text-[#29251F] scroll-mt-16 sm:scroll-mt-20"
    >
      {/* Vintage subtle ambient background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#FFF9F0_0%,rgba(244,233,220,0.4)_60%,rgba(217,188,158,0.25)_100%)]" />



      <div className="relative mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
        {/* ── HEADER ROW: CONDITIONAL BETWEEN MAIN PAGE & DEDICATED FULL MENU PAGE ── */}
        {isFullMenu ? (
          /* ── FULL MENU HERO: DISTINCT WEBSITE-LIKE DESIGN ── */
          <div className="relative mb-8 sm:mb-12 rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E8] to-[#F2E5D2] border border-[#D9C8B5] p-6 sm:p-10 shadow-[0_4px_24px_rgba(41,37,31,0.06)] overflow-hidden">
            {/* Ambient decorative background glows */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#A34B3D]/5 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#5D6B3F]/10 blur-2xl" />

            {/* Breadcrumb & Live Counter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 border-b border-[#D8C7B3]/50 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#7A6F5D]">
                <Link href="/" className="hover:text-[#A34B3D] transition-colors">
                  Home
                </Link>
                <span className="text-[#A89A88]">/</span>
                <span className="text-[#A34B3D] font-bold">Full Bakery Menu</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5D6B3F]/15 text-[#4D5A32] text-[10.5px] font-bold tracking-wider uppercase border border-[#5D6B3F]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C47] animate-pulse" />
                <span>{activeMenuItems.length} Fresh Items Live</span>
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              {/* Left Column: Heading, Subheading & Reassurance Badges */}
              <div className="max-w-2xl space-y-3 sm:space-y-4">
                <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#8C765C] bg-[#ECE0D0]/80 px-3 py-1 rounded-full border border-[#D8CABE]">
                  ✦ The Complete Artisanal Menu ✦
                </span>

                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-[#29251F] leading-[1.1] tracking-tight">
                  Made with love, <br />
                  <span className="relative inline-flex items-center gap-2.5 sm:gap-3 text-[#A34B3D]">
                    Made to indulge
                    <svg
                      className="w-6 h-6 sm:w-10 sm:h-10 text-[#A34B3D] inline-block -rotate-6 transform"
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
                </h1>

                <p className="text-sm sm:text-base text-[#5E5446] leading-relaxed font-normal max-w-xl">
                  Browse our complete handcrafted selection — slow-fermented European sourdoughs, rich butter tea cakes, guilt-free spreads, and celebration desserts baked fresh daily in Gurugram.
                </p>

                {/* Highlights Pill Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 border border-[#D8C7B3] text-[#4A4134] font-medium shadow-2xs">
                    🍞 Freshly Baked Daily
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 border border-[#D8C7B3] text-[#4A4134] font-medium shadow-2xs">
                    🧈 100% Pure Butter
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 border border-[#D8C7B3] text-[#4A4134] font-medium shadow-2xs">
                    🌿 100% Eggless Options
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 border border-[#D8C7B3] text-[#4A4134] font-medium shadow-2xs">
                    ⚡ Same-Day Delivery
                  </span>
                </div>
              </div>

              {/* Right Column: Circular Badge & Brand Stamp */}
              <div className="flex sm:flex-row lg:flex-col items-center justify-start lg:justify-center gap-4 sm:gap-6 shrink-0 lg:border-l lg:border-[#D8C7B3]/60 lg:pl-8">
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0">
                  <Image
                    src="/logo-brand.png"
                    alt="The Indulgent Spoon"
                    fill
                    className="object-contain drop-shadow-md"
                    sizes="112px"
                    priority
                  />
                </div>
                <div className="text-center sm:text-left lg:text-center">
                  <p
                    className="text-base sm:text-xl text-[#7A6348] italic font-serif leading-tight font-medium"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    Good Desserts, <br />Happier Days
                  </p>
                  <p className="text-[10px] text-[#8C7A64] uppercase tracking-widest font-bold mt-1">
                    Gurugram • Mayfield Gardens
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── MAIN PAGE: OUR MENU SECTION HEADER ROW ── */
          <div className="relative mb-6 sm:mb-9 flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
            {/* Left: Heading & Subheading */}
            <div className="max-w-xl">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#7A6F5D] block mb-1 sm:mb-2">
                OUR MENU
              </span>
              <h2 className="font-serif text-[1.75rem] sm:text-4xl lg:text-[3.25rem] font-bold text-[#29251F] leading-[1.12] tracking-tight">
                Made with love, <br />
                <span className="relative inline-flex items-center gap-2 sm:gap-3">
                  Made to indulge
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

              {/* Circular stamp badge — brand logo */}
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 select-none shrink-0">
                <Image
                  src="/logo-brand.png"
                  alt="The Indulgent Spoon"
                  fill
                  className="object-contain drop-shadow-sm"
                  sizes="96px"
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── CATEGORY NAV: FULL MENU = STICKY PILLS / HOME = SLIDER */}
        {/* ══════════════════════════════════════════════════════ */}
        {isFullMenu ? (
          /* ─── FULL MENU: STICKY CIRCULAR CARD BAR (Mobile & Desktop) ─── */
          <div className="sticky top-[112px] sm:top-[124px] z-30 -mx-3.5 sm:-mx-6 lg:-mx-8 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-[#F4E9DC]/97 backdrop-blur-md border-b border-[#E2D3C0] shadow-[0_4px_16px_rgba(41,37,31,0.06)] mb-4 sm:mb-6">
            <div
              ref={tabsContainerRef}
              className="flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-none scroll-smooth"
            >
              {categorySections.map((sec, index) => {
                const isActive = activeSectionId === sec.id;
                const catCard = activeCategoryCards.find((c) => c.id === sec.id);
                const catImage = catCard?.image || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80";
                const catCount = catCard?.count || `${sec.items.length} items`;
                return (
                  <div key={sec.id} className="relative flex items-center shrink-0">
                    {index > 0 && (
                      <span className="absolute -left-1.5 sm:-left-2 z-10 text-[7px] sm:text-[8px] text-[#C48473] select-none pointer-events-none opacity-70">◆</span>
                    )}
                    <button
                      ref={(el) => { tabRefs.current[sec.id] = el; }}
                      onClick={() => scrollToCategorySection(sec.id)}
                      className={`group relative flex flex-col items-center justify-between w-[86px] sm:w-[98px] md:w-[104px] pt-2.5 pb-2 px-1.5 rounded-2xl transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "bg-[#F3EFE4] border-2 border-[#8A8F76] shadow-[0_4px_16px_rgba(138,143,118,0.22)] scale-[1.03]"
                          : "bg-[#FAF5ED]/95 border border-[#E7DCCE]/80 hover:border-[#8A8F76]/50 hover:bg-[#F6EFE3] hover:shadow-sm shadow-[0_1px_4px_rgba(41,37,31,0.03)]"
                      }`}
                    >
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 flex items-center justify-center mb-1">
                        <div className="relative w-full h-full rounded-full overflow-hidden bg-[#E8DDD0]/70 border border-[#D8CABE]/50 shadow-inner">
                          <Image src={catImage} alt={sec.name} fill sizes="56px" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                        </div>
                      </div>
                      <h3 className={`font-serif text-[11.5px] sm:text-[12.5px] font-semibold tracking-tight transition-colors leading-tight text-center ${
                        isActive ? "text-[#29251F] font-bold" : "text-[#3D362C] group-hover:text-[#29251F]"
                      }`}>{sec.name}</h3>
                      <LeafDivider active={isActive} />
                      <span className={`text-[9.5px] sm:text-[10px] tracking-wide ${ isActive ? "text-[#5E5546] font-medium" : "text-[#7D7363]" }`}>{catCount}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─── HORIZONTAL CARD SLIDER (homepage) ─── */
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

                    <Link
                      href={`/full-menu#section-${cat.id}`}
                      className="group relative flex flex-col items-center justify-between w-[92px] sm:w-[104px] md:w-[112px] pt-3 pb-2.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer bg-[#FAF5ED]/95 border border-[#E7DCCE]/80 hover:border-[#8A8F76]/50 hover:bg-[#F6EFE3] hover:shadow-xs shadow-[0_1px_4px_rgba(41,37,31,0.03)]"
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
                      <h3
                        className="font-serif text-[12.5px] sm:text-sm font-semibold tracking-tight transition-colors leading-tight text-center text-[#3D362C] group-hover:text-[#29251F]"
                      >
                        {cat.name}
                      </h3>

                      {/* Leaf Divider */}
                      <LeafDivider active={false} />

                      {/* Item Count */}
                      <span
                        className="text-[10px] sm:text-[10.5px] tracking-wide transition-colors text-[#7D7363]"
                      >
                        {cat.count}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── FULL MENU: STACKED CATEGORY SECTIONS WITH HEADINGS ─────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {isFullMenu ? (
          <div className="mt-6 space-y-12 sm:space-y-16">
            {categorySections.map((sec, secIdx) => (
              <section
                key={sec.id}
                id={`section-${sec.id}`}
                className="scroll-mt-[231px] sm:scroll-mt-[251px]"
              >
                {/* ── Category Section Heading ── */}
                <div className="relative mb-5 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    {secIdx === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E5D7C3] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#69553F]">
                        <span>✨</span>
                        <span>Popular • Top Rated</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFE4D6] text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#7C6C58]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8A8F76]" />
                        <span>Freshly Baked Daily</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-3 border-b border-[#D8CABE]/80 pb-2.5">
                    <div className="flex items-baseline gap-2.5 flex-1 min-w-0">
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#29251F] tracking-tight leading-tight">
                        {sec.name}
                      </h2>
                      <span className="text-[11px] sm:text-xs text-[#827563] font-serif italic hidden xs:inline">
                        — Artisan creations
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FAF5ED] border border-[#D8CABE] text-[10.5px] sm:text-[11.5px] font-semibold text-[#5C5243] shadow-[0_1px_3px_rgba(41,37,31,0.04)]">
                        {sec.items.length} {sec.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile list */}
                <div className="flex flex-col gap-4 md:hidden">
                  {sec.items.map((item) => {
                    const qty = getQty(item.id);
                    const isJustAdded = addedItem === item.id;
                    const inCartCount = getProductQuantity(item.id);
                    const isAlreadyInCart = inCartCount > 0;
                    const isCatSoldOut = isProductCatSoldOut(item.id);
                    const catRemaining = getProductCatRemaining(item.id);
                    return (
                      <div
                        key={`fm-mob-${sec.id}-${item.id}`}
                        className={`flex flex-row rounded-2xl bg-[#FAF4EB] border overflow-hidden shadow-[0_2px_10px_rgba(41,37,31,0.05)] transition-all ${
                          isCatSoldOut ? "border-[#E5D7C6]/60 opacity-60" : "border-[#E5D7C6]"
                        }`}
                      >
                        <Link
                          href={`/store/${slug}/product/${item.id}`}
                          data-product-img={item.id}
                          className="relative w-[42%] shrink-0 overflow-hidden bg-[#EFE5D7] block cursor-pointer group"
                        >
                          <ProductImage src={item.image} alt={item.name} fill sizes="45vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                          {isCatSoldOut ? (
                            <div className="absolute inset-0 bg-[#29251F]/60 flex items-center justify-center z-10">
                              <span className="text-[10px] font-bold text-[#F5EBDD] uppercase tracking-wider">
                                Sold Out
                              </span>
                            </div>
                          ) : isAlreadyInCart ? (
                            <div className="absolute top-2 right-2 z-10 animate-in fade-in zoom-in-75">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-white bg-[#4D7C47] shadow-sm"><Check className="w-2.5 h-2.5 stroke-[3]" /><span>{inCartCount} in Cart</span></span>
                            </div>
                          ) : null}
                          {item.badge && item.badge !== "NONE" && !isCatSoldOut && parseBadges(item.badge).length > 0 && (
                            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[85%]">
                              {parseBadges(item.badge).map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  className={`inline-block px-2 py-0.5 rounded-[4px] text-[8.5px] font-bold uppercase tracking-wider shadow-xs ${getBadgeColorClass(b)}`}
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                        <div className="w-[58%] p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <Link href={`/store/${slug}/product/${item.id}`} className="hover:text-[#A34B3D] transition-colors flex-1 min-w-0">
                                <h3 className="font-serif text-sm font-bold text-[#29251F] leading-tight line-clamp-2">{item.name}</h3>
                              </Link>
                              <VegSymbol className="w-3.5 h-3.5 mt-0.5" />
                            </div>
                            <p className="mt-1 text-[11px] text-[#706657] leading-snug line-clamp-2">{item.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.map((tag) => (<span key={tag} className="px-1.5 py-0.5 rounded-[4px] bg-[#EFE8DC] text-[#695F52] text-[9px] font-medium leading-none">{tag}</span>))}
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#EAE0D1] flex items-center justify-between gap-1">
                            <div className="flex flex-col">
                              <span className="font-serif text-sm font-bold text-[#29251F] whitespace-nowrap">₹{item.price}</span>
                              {catRemaining != null && (
                                <span className="text-[9px] font-bold text-[#C26B59] animate-pulse">Only {catRemaining} left!</span>
                              )}
                            </div>
                            {!isCatSoldOut && (
                              <div className="flex items-center rounded-lg bg-[#EFE8DC] px-1.5 py-0.5 border border-[#E2D6C6]">
                                <button onClick={() => handleDecrement(item.id)} className="p-0.5 text-[#695F52] hover:text-[#29251F] cursor-pointer" aria-label="Decrease"><Minus className="w-3 h-3" strokeWidth={2} /></button>
                                <span className="w-4 text-center text-[11px] font-bold text-[#29251F]">{inCartCount > 0 ? inCartCount : qty}</span>
                                <button onClick={() => handleIncrement(item.id)} className="p-0.5 text-[#695F52] hover:text-[#29251F] cursor-pointer" aria-label="Increase"><Plus className="w-3 h-3" strokeWidth={2} /></button>
                              </div>
                            )}
                            {isCatSoldOut ? (
                              <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#A95145] bg-[#A95145]/10 border border-[#A95145]/20 uppercase tracking-wider whitespace-nowrap">
                                Sold Out
                              </span>
                            ) : (
                              <button
                                onClick={(e) => handleAddToCart(item, e)}
                                className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap ${ isJustAdded ? "bg-[#4D7C47] text-white" : isAlreadyInCart ? "bg-[#5D6B3F] hover:bg-[#4E5B33] text-white" : "bg-[#A34B3D] hover:bg-[#8F3F32] text-white active:scale-95" }`}
                              >
                                {isJustAdded ? (<><Check className="w-3 h-3" strokeWidth={2.5} /><span>Added!</span></>) : isAlreadyInCart ? (<><Check className="w-3 h-3" strokeWidth={2.5} /><span>In Cart ({inCartCount}) +</span></>) : (<><ShoppingCart className="w-3 h-3" strokeWidth={2} /><span>Add +</span></>)}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop grid */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {sec.items.map((item) => {
                    const isFav = !!favorites[item.id];
                    const qty = getQty(item.id);
                    const isJustAdded = addedItem === item.id;
                    const inCartCount = getProductQuantity(item.id);
                    const isAlreadyInCart = inCartCount > 0;
                    const isCatSoldOut = isProductCatSoldOut(item.id);
                    const catRemaining = getProductCatRemaining(item.id);
                    return (
                      <div key={`fm-desk-${sec.id}-${item.id}`} className={`group flex flex-col rounded-3xl bg-[#FAF5ED] border p-3.5 sm:p-4 transition-all duration-300 ${
                        isCatSoldOut ? "border-[#E7DCCE]/60 opacity-60" : "border-[#E7DCCE] shadow-[0_2px_12px_rgba(41,37,31,0.04)] hover:shadow-[0_8px_24px_rgba(41,37,31,0.08)] hover:border-[#D4C3AE]"
                      }`}>
                        <Link href={`/store/${slug}/product/${item.id}`} data-product-img={item.id} className="relative aspect-4/3 sm:aspect-[1.18/1] w-full overflow-hidden rounded-2xl bg-[#EFE5D7] block cursor-pointer">
                          <ProductImage src={item.image} alt={item.name} fill sizes="(max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          {isCatSoldOut ? (
                            <div className="absolute inset-0 bg-[#29251F]/60 flex items-center justify-center z-10">
                              <span className="text-xs font-bold text-[#F5EBDD] uppercase tracking-wider">
                                Sold Out
                              </span>
                            </div>
                          ) : isAlreadyInCart ? (
                            <div className="absolute top-3 left-3 z-20 animate-in fade-in zoom-in-75">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-[#4D7C47] shadow-sm border border-white/20"><Check className="w-3 h-3 stroke-[3]" /><span>{inCartCount} in Cart</span></span>
                            </div>
                          ) : null}
                          {item.badge && !isAlreadyInCart && !isCatSoldOut && parseBadges(item.badge).length > 0 && (
                            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[85%]">
                              {parseBadges(item.badge).map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs ${getBadgeColorClass(b)}`}
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.id); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/40 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10" aria-label="Add to favorites">
                            <Heart className={`w-4 h-4 transition-colors ${ isFav ? "fill-[#E04D3E] text-[#E04D3E]" : "text-white" }`} strokeWidth={1.8} />
                          </button>
                          {item.doodleText && (
                            <div className="absolute bottom-3 right-3 text-right pointer-events-none z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              <span className="text-xs font-serif italic text-white/95 leading-none block -rotate-6" style={{ fontFamily: "Georgia, serif" }}>{item.doodleText}</span>
                            </div>
                          )}
                        </Link>
                        <div className="flex flex-1 flex-col pt-4 px-1 pb-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {item.hasChefHat && <ChefHat className="w-4 h-4 text-[#85725A] shrink-0" />}
                              <Link href={`/store/${slug}/product/${item.id}`} className="hover:text-[#A34B3D] transition-colors">
                                <h3 className="font-serif text-base sm:text-[1.125rem] font-bold text-[#29251F] leading-snug">{item.name}</h3>
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col items-end">
                                <span className="font-serif text-base sm:text-lg font-bold text-[#29251F] whitespace-nowrap">₹{item.price}</span>
                                {catRemaining != null && (
                                  <span className="text-[10px] font-bold text-[#C26B59] animate-pulse">Only {catRemaining} left!</span>
                                )}
                              </div>
                              <VegSymbol className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs sm:text-sm text-[#706657] leading-relaxed line-clamp-2">{item.description}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (<span key={tag} className="px-2.5 py-0.5 rounded-md bg-[#EFE8DC] text-[#695F52] text-[10px] sm:text-[11px] font-medium">{tag}</span>))}
                          </div>
                          <div className="mt-auto pt-4 flex items-center gap-2.5">
                            {!isCatSoldOut && (
                              <div className="flex items-center rounded-xl bg-[#EFE8DC] px-2 py-1.5 border border-[#E2D6C6]">
                                <button onClick={() => handleDecrement(item.id)} className="p-1 text-[#695F52] hover:text-[#29251F] transition-colors cursor-pointer" aria-label="Decrease"><Minus className="w-3.5 h-3.5" strokeWidth={2} /></button>
                                <span className="w-6 text-center text-xs font-bold text-[#29251F]">{inCartCount > 0 ? inCartCount : qty}</span>
                                <button onClick={() => handleIncrement(item.id)} disabled={!canIncrementItem(item.id)} className={`p-1 transition-colors ${canIncrementItem(item.id) ? "text-[#695F52] hover:text-[#29251F] cursor-pointer" : "text-[#B5A490] opacity-40 cursor-not-allowed"}`} aria-label="Increase"><Plus className="w-3.5 h-3.5" strokeWidth={2} /></button>
                              </div>
                            )}
                            {isCatSoldOut ? (
                              <div className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-[#A95145] bg-[#A95145]/10 border border-[#A95145]/20 uppercase tracking-wider">
                                Sold Out
                              </div>
                            ) : isAlreadyInCart && !canIncrementItem(item.id) ? (
                              <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#5D6B3F]/75 text-white cursor-not-allowed shadow-xs">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Max in Cart ({inCartCount})</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleAddToCart(item, e)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-xs ${ isJustAdded ? "bg-[#4D7C47] text-white" : isAlreadyInCart ? "bg-[#5D6B3F] hover:bg-[#4E5B33] text-white" : "bg-[#A34B3D] hover:bg-[#8F3F32] text-white active:scale-[0.98]" }`}
                              >
                                {isJustAdded ? (<><Check className="w-4 h-4" strokeWidth={2.5} /><span>Added!</span></>) : isAlreadyInCart ? (<><Check className="w-4 h-4" strokeWidth={2.5} /><span>In Cart ({inCartCount}) • Add More</span></>) : (<><ShoppingCart className="w-4 h-4" strokeWidth={2} /><span>Add to Cart</span></>)}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <>
        {/* ══════════════════════════════════════════════════════ */}
        {/* ── MOBILE VIEW: HORIZONTAL CARD SPLIT (md:hidden) ── */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 md:hidden">
          {displayItems.map((item) => {
            const qty = getQty(item.id);
            const isJustAdded = addedItem === item.id;
            const inCartCount = getProductQuantity(item.id);
            const isAlreadyInCart = inCartCount > 0;
            const isCatSoldOut = isProductCatSoldOut(item.id);
            const catRemaining = getProductCatRemaining(item.id);

            return (
              <div
                key={`mobile-${item.id}`}
                className={`flex flex-row rounded-2xl bg-[#FAF4EB] border overflow-hidden shadow-[0_2px_10px_rgba(41,37,31,0.05)] transition-all ${
                  isCatSoldOut ? "border-[#E5D7C6]/60 opacity-60" : "border-[#E5D7C6]"
                }`}
              >
                {/* Left Side: Product Image (42% width) */}
                <Link
                  href={`/store/${slug}/product/${item.id}`}
                  data-product-img={item.id}
                  className="relative w-[42%] shrink-0 overflow-hidden bg-[#EFE5D7] block cursor-pointer group"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="45vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Sold Out Overlay or In Cart Indicator */}
                  {isCatSoldOut ? (
                    <div className="absolute inset-0 bg-[#29251F]/60 flex items-center justify-center z-10">
                      <span className="text-[10px] font-bold text-[#F5EBDD] uppercase tracking-wider">
                        Sold Out
                      </span>
                    </div>
                  ) : isAlreadyInCart ? (
                    <div className="absolute top-2 right-2 z-10 animate-in fade-in zoom-in-75">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-white bg-[#4D7C47] shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>{inCartCount} in Cart</span>
                      </span>
                    </div>
                  ) : null}

                  {/* Top-Left Badges */}
                  {item.badge && item.badge !== "NONE" && !isCatSoldOut && parseBadges(item.badge).length > 0 && (
                    <div className="absolute top-2 left-2 z-10 flex flex-wrap items-start gap-1 max-w-[85%]">
                      {parseBadges(item.badge).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider shadow-xs ${getBadgeColorClass(b)}`}
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
                    {/* Price & remaining badge */}
                    <div className="flex flex-col">
                      <span className="font-serif text-sm font-bold text-[#29251F] whitespace-nowrap">
                        ₹{item.price}
                      </span>
                      {catRemaining != null && (
                        <span className="text-[9px] font-bold text-[#C26B59] animate-pulse">Only {catRemaining} left!</span>
                      )}
                    </div>

                    {/* Stepper */}
                    {!isCatSoldOut && (
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
                          disabled={!canIncrementItem(item.id)}
                          className={`p-0.5 transition-colors ${
                            canIncrementItem(item.id)
                              ? "text-[#695F52] hover:text-[#29251F] cursor-pointer"
                              : "text-[#B5A490] opacity-40 cursor-not-allowed"
                          }`}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" strokeWidth={2} />
                        </button>
                      </div>
                    )}

                    {/* Add Button or Sold Out with In-Cart State */}
                    {isCatSoldOut ? (
                      <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#A95145] bg-[#A95145]/10 border border-[#A95145]/20 uppercase tracking-wider whitespace-nowrap">
                        Sold Out
                      </span>
                    ) : isAlreadyInCart && !canIncrementItem(item.id) ? (
                      <span className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-[#5D6B3F]/75 text-white cursor-not-allowed whitespace-nowrap">
                        Max ({inCartCount})
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
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
                    )}
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
            const isCatSoldOut = isProductCatSoldOut(item.id);
            const catRemaining = getProductCatRemaining(item.id);

            return (
              <div
                key={`desktop-${item.id}`}
                className={`group flex flex-col rounded-3xl bg-[#FAF5ED] border p-3.5 sm:p-4 transition-all duration-300 ${
                  isCatSoldOut ? "border-[#E7DCCE]/60 opacity-60" : "border-[#E7DCCE] shadow-[0_2px_12px_rgba(41,37,31,0.04)] hover:shadow-[0_8px_24px_rgba(41,37,31,0.08)] hover:border-[#D4C3AE]"
                }`}
              >
                {/* Image Container */}
                <Link
                  href={`/store/${slug}/product/${item.id}`}
                  data-product-img={item.id}
                  className="relative aspect-4/3 sm:aspect-[1.18/1] w-full overflow-hidden rounded-2xl bg-[#EFE5D7] block cursor-pointer"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Sold Out or In Cart Indicator Ribbon/Badge */}
                  {isCatSoldOut ? (
                    <div className="absolute inset-0 bg-[#29251F]/60 flex items-center justify-center z-10">
                      <span className="text-xs font-bold text-[#F5EBDD] uppercase tracking-wider">
                        Sold Out
                      </span>
                    </div>
                  ) : isAlreadyInCart ? (
                    <div className="absolute top-3 left-3 z-20 animate-in fade-in zoom-in-75">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-[#4D7C47] shadow-sm border border-white/20">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{inCartCount} in Cart</span>
                      </span>
                    </div>
                  ) : null}

                  {/* Top-Left Badges */}
                  {item.badge && !isAlreadyInCart && !isCatSoldOut && parseBadges(item.badge).length > 0 && (
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[85%]">
                      {parseBadges(item.badge).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs ${getBadgeColorClass(b)}`}
                        >
                          {b}
                        </span>
                      ))}
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
                      <div className="flex flex-col items-end">
                        <span className="font-serif text-base sm:text-lg font-bold text-[#29251F] whitespace-nowrap">
                          ₹{item.price}
                        </span>
                        {catRemaining != null && (
                          <span className="text-[10px] font-bold text-[#C26B59] animate-pulse">Only {catRemaining} left!</span>
                        )}
                      </div>
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
                    {!isCatSoldOut && (
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
                          disabled={!canIncrementItem(item.id)}
                          className={`p-1 transition-colors ${
                            canIncrementItem(item.id)
                              ? "text-[#695F52] hover:text-[#29251F] cursor-pointer"
                              : "text-[#B5A490] opacity-40 cursor-not-allowed"
                          }`}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    )}

                    {/* Add to Cart Button or Sold Out */}
                    {isCatSoldOut ? (
                      <div className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-[#A95145] bg-[#A95145]/10 border border-[#A95145]/20 uppercase tracking-wider">
                        Sold Out
                      </div>
                    ) : isAlreadyInCart && !canIncrementItem(item.id) ? (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#5D6B3F]/75 text-white cursor-not-allowed shadow-xs">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Max in Cart ({inCartCount})</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
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
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Catalog Link or More Coming Soon */}
        <div className="mt-8 sm:mt-12 text-center">
          {activeCategory === "all" ? (
            <div className="inline-flex flex-col items-center justify-center py-4 px-6 sm:px-8 rounded-2xl bg-[#FAF5ED]/90 border border-[#E7DCCE] shadow-xs max-w-md mx-auto">
              <div className="flex items-center gap-2.5 text-[#A34B3D] mb-1">
                <span className="h-px w-6 sm:w-8 bg-[#A34B3D]/30" />
                <span className="font-serif italic text-base sm:text-lg font-semibold tracking-wide">
                  More Delights Coming Soon
                </span>
                <span className="h-px w-6 sm:w-8 bg-[#A34B3D]/30" />
              </div>
              <p className="text-xs sm:text-[13px] text-[#706657] font-medium leading-relaxed">
                Our chefs are constantly baking fresh experiments and seasonal treats. Stay tuned! ♡
              </p>
              <Link
                href="/full-menu"
                className="mt-3.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A34B3D] hover:text-[#82382D] transition-colors group cursor-pointer"
              >
                <span>Explore Complete Kitchen Menu</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/full-menu"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-[#A34B3D] hover:text-[#82382D] transition-colors group cursor-pointer"
            >
              <span>Explore Complete Kitchen Menu</span>
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          )}
        </div>
        </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MOBILE FLOATING MENU FAB (bottom-right, md:hidden) ──── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* ── FAB BUTTON ── */}
        <button
          onClick={() => setIsCategoryDrawerOpen(true)}
          aria-label="Browse categories"
          className="fixed bottom-6 right-5 z-40 flex flex-col items-center justify-center gap-0.5 w-[60px] h-[60px] rounded-full bg-[#29251F] text-white shadow-[0_6px_24px_rgba(41,37,31,0.45)] active:scale-95 transition-transform duration-150"
        >
          <LayoutGrid className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] leading-none">Menu</span>
        </button>

        {/* ── BACKDROP ── */}
        <div
          onClick={() => setIsCategoryDrawerOpen(false)}
          className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            isCategoryDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden="true"
        />

        {/* ── DRAWER SHEET ── */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 bg-[#FAF5ED] rounded-t-3xl shadow-[0_-8px_40px_rgba(41,37,31,0.22)] transition-transform duration-300 ease-out ${
            isCategoryDrawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "82dvh" }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#C8BAA8]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#EAE0D1]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#29251F] leading-tight">Our Menu</h3>
              <p className="text-[11px] text-[#7A6A5A] mt-0.5">Tap a category to explore</p>
            </div>
            <button
              onClick={() => setIsCategoryDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#695F52] active:bg-[#E2D6C6] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category list — scrollable */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(82dvh - 100px)" }}>
            <ul className="px-4 py-3 space-y-2 pb-8">
              {activeCategoryCards.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <li key={cat.id}>
                    <button
                      onClick={() => handleSelectCategoryFromDrawer(cat.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                        isActive
                          ? "bg-[#29251F] text-white shadow-md"
                          : "bg-white border border-[#EAE0D1] text-[#29251F] hover:border-[#C8BAA8] hover:bg-[#FAF5ED]"
                      }`}
                    >
                      {/* Category thumbnail */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#EFE5D7]">
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      {/* Name + count */}
                      <div className="flex-1 text-left">
                        <span className={`font-serif text-base font-bold block leading-tight ${isActive ? "text-white" : "text-[#29251F]"}`}>
                          {cat.name}
                        </span>
                        <span className={`text-[11px] mt-0.5 block ${isActive ? "text-white/70" : "text-[#7A6A5A]"}`}>
                          {cat.count}
                        </span>
                      </div>

                      {/* Active chevron / indicator */}
                      {isActive ? (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#C8BAA8] shrink-0" strokeWidth={1.8} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

    </section>

  );
}
