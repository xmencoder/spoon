"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from "react";
import type { Product } from "@/types/database";

export interface CartAddon {
  id: string;
  label: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique cart item identifier (e.g. productId + size + addons)
  product: Product;
  quantity: number;
  sizeLabel?: string;
  addons?: CartAddon[];
  unitPrice: number; // Single item price including size & addons
}

interface CartState {
  items: CartItem[];
  restaurantSlug: string;
  hasGiftNote: boolean;
  giftNote: string;
}

type CartAction =
  | {
      type: "ADD_ITEM";
      product: Product;
      quantity?: number;
      sizeLabel?: string;
      addons?: CartAddon[];
      unitPrice?: number;
    }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "INCREMENT"; itemId: string }
  | { type: "DECREMENT"; itemId: string }
  | { type: "SET_QUANTITY"; itemId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[]; hasGiftNote?: boolean; giftNote?: string }
  | { type: "SET_GIFT_NOTE"; note: string }
  | { type: "SET_HAS_GIFT_NOTE"; has: boolean };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        items: action.items,
        hasGiftNote: action.hasGiftNote ?? state.hasGiftNote,
        giftNote: action.giftNote ?? state.giftNote,
      };

    case "ADD_ITEM": {
      const qtyToAdd = action.quantity && action.quantity > 0 ? action.quantity : 1;
      const calculatedUnitPrice =
        action.unitPrice !== undefined ? action.unitPrice : action.product.price;
      
      const addonKey = action.addons
        ? [...action.addons].map((a) => a.id).sort().join("-")
        : "";
      const sizeKey = action.sizeLabel || "default";
      const itemId = `${action.product.id}-${sizeKey}-${addonKey}`;

      const existingIndex = state.items.findIndex((i) => i.id === itemId);

      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + qtyToAdd,
        };
        return { ...state, items: updatedItems };
      }

      const newItem: CartItem = {
        id: itemId,
        product: action.product,
        quantity: qtyToAdd,
        sizeLabel: action.sizeLabel,
        addons: action.addons,
        unitPrice: calculatedUnitPrice,
      };

      return {
        ...state,
        items: [...state.items, newItem],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.itemId),
      };

    case "INCREMENT":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.itemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };

    case "DECREMENT": {
      const item = state.items.find((i) => i.id === action.itemId);
      if (!item) return state;
      if (item.quantity <= 1) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.itemId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.itemId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }

    case "SET_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.itemId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.itemId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case "SET_GIFT_NOTE":
      return { ...state, giftNote: action.note };

    case "SET_HAS_GIFT_NOTE":
      return { ...state, hasGiftNote: action.has };

    case "CLEAR":
      return { ...state, items: [], hasGiftNote: false, giftNote: "" };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  giftNoteFee: number;
  total: number;
  hasGiftNote: boolean;
  giftNote: string;
  isDrawerOpen: boolean;
  lastAddedItem: CartItem | null;
  restaurantSlug: string;
  addItem: (
    product: Product,
    quantity?: number,
    options?: {
      sizeLabel?: string;
      addons?: CartAddon[];
      unitPrice?: number;
    }
  ) => void;
  removeItem: (itemId: string) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getQuantity: (itemIdOrProductId: string) => number;
  getProductQuantity: (productId: string) => number;
  hasItem: (productId: string) => boolean;
  setHasGiftNote: (has: boolean) => void;
  setGiftNote: (note: string) => void;
  setIsDrawerOpen: (open: boolean) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const DEFAULT_RESTAURANT_SLUG = "the-indulgent-spoon";
export const DELIVERY_FEE = 0;
export const PACKAGING_FEE = 40;
export const GIFT_NOTE_FEE = 40;

export function CartProvider({
  children,
  restaurantSlug = DEFAULT_RESTAURANT_SLUG,
}: {
  children: React.ReactNode;
  restaurantSlug?: string;
}) {
  const storageKey = `spoon_cart_${restaurantSlug}`;
  const giftNoteStorageKey = `spoon_gift_note_${restaurantSlug}`;

  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    restaurantSlug,
    hasGiftNote: false,
    giftNote: "",
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const storedGift = localStorage.getItem(giftNoteStorageKey);
      let parsedItems: CartItem[] = [];
      let parsedGift = { has: false, note: "" };

      if (stored) {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw)) {
          // Normalize legacy items if needed
          parsedItems = raw.map((item: any) => {
            const unitPrice =
              item.unitPrice !== undefined
                ? item.unitPrice
                : item.product?.price || 0;
            const itemId =
              item.id ||
              `${item.product?.id || "p"}-${item.sizeLabel || "default"}-${
                item.addons ? item.addons.map((a: any) => a.id).join("-") : ""
              }`;
            return {
              id: itemId,
              product: item.product,
              quantity: item.quantity || 1,
              sizeLabel: item.sizeLabel,
              addons: item.addons,
              unitPrice,
            };
          });
        }
      }

      if (storedGift) {
        parsedGift = JSON.parse(storedGift);
      }

      dispatch({
        type: "HYDRATE",
        items: parsedItems,
        hasGiftNote: parsedGift.has,
        giftNote: parsedGift.note,
      });
    } catch {
      // ignore parse errors
    }
  }, [storageKey, giftNoteStorageKey]);

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.items));
      localStorage.setItem(
        giftNoteStorageKey,
        JSON.stringify({ has: state.hasGiftNote, note: state.giftNote })
      );
      // Dispatch storage event for other components listening
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore storage errors
    }
  }, [state.items, state.hasGiftNote, state.giftNote, storageKey, giftNoteStorageKey]);

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      options?: {
        sizeLabel?: string;
        addons?: CartAddon[];
        unitPrice?: number;
      }
    ) => {
      const unitPrice =
        options?.unitPrice !== undefined ? options.unitPrice : product.price;
      const sizeKey = options?.sizeLabel || "default";
      const addonKey = options?.addons
        ? [...options.addons].map((a) => a.id).sort().join("-")
        : "";
      const itemId = `${product.id}-${sizeKey}-${addonKey}`;

      const itemSnapshot: CartItem = {
        id: itemId,
        product,
        quantity,
        sizeLabel: options?.sizeLabel,
        addons: options?.addons,
        unitPrice,
      };

      dispatch({
        type: "ADD_ITEM",
        product,
        quantity,
        sizeLabel: options?.sizeLabel,
        addons: options?.addons,
        unitPrice,
      });

      setLastAddedItem(itemSnapshot);
      setIsDrawerOpen(true);
    },
    []
  );

  const removeItem = useCallback(
    (itemId: string) => dispatch({ type: "REMOVE_ITEM", itemId }),
    []
  );
  const increment = useCallback(
    (itemId: string) => dispatch({ type: "INCREMENT", itemId }),
    []
  );
  const decrement = useCallback(
    (itemId: string) => dispatch({ type: "DECREMENT", itemId }),
    []
  );
  const setQuantity = useCallback(
    (itemId: string, quantity: number) =>
      dispatch({ type: "SET_QUANTITY", itemId, quantity }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const setHasGiftNote = useCallback(
    (has: boolean) => dispatch({ type: "SET_HAS_GIFT_NOTE", has }),
    []
  );
  const setGiftNote = useCallback(
    (note: string) => dispatch({ type: "SET_GIFT_NOTE", note }),
    []
  );

  const openCartDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const getQuantity = useCallback(
    (id: string) => {
      const matchById = state.items.find((i) => i.id === id);
      if (matchById) return matchById.quantity;
      return state.items
        .filter(
          (i) =>
            i.product.id === id ||
            i.id === id ||
            i.id.startsWith(id + "-") ||
            i.product.id.startsWith(id + "-")
        )
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [state.items]
  );

  const getProductQuantity = useCallback(
    (productId: string) => {
      return state.items
        .filter(
          (i) =>
            i.product.id === productId ||
            i.id === productId ||
            i.id.startsWith(productId + "-") ||
            i.product.id.startsWith(productId + "-")
        )
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [state.items]
  );

  const hasItem = useCallback(
    (productId: string) => {
      return state.items.some(
        (i) =>
          i.product.id === productId ||
          i.id === productId ||
          i.id.startsWith(productId + "-") ||
          i.product.id.startsWith(productId + "-")
      );
    },
    [state.items]
  );

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const deliveryFee = totalItems > 0 ? DELIVERY_FEE : 0;
  const packagingFee = totalItems > 0 ? PACKAGING_FEE : 0;
  const giftNoteFee = state.hasGiftNote ? GIFT_NOTE_FEE : 0;
  const total = subtotal + deliveryFee + packagingFee + giftNoteFee;

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        totalItems,
        subtotal,
        deliveryFee,
        packagingFee,
        giftNoteFee,
        total,
        hasGiftNote: state.hasGiftNote,
        giftNote: state.giftNote,
        isDrawerOpen,
        lastAddedItem,
        restaurantSlug,
        addItem,
        removeItem,
        increment,
        decrement,
        setQuantity,
        clearCart,
        getQuantity,
        getProductQuantity,
        hasItem,
        setHasGiftNote,
        setGiftNote,
        setIsDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Return a safe fallback context if rendered outside CartProvider during build
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
      deliveryFee: 0,
      packagingFee: 0,
      giftNoteFee: 0,
      total: 0,
      hasGiftNote: false,
      giftNote: "",
      isDrawerOpen: false,
      lastAddedItem: null,
      restaurantSlug: DEFAULT_RESTAURANT_SLUG,
      addItem: () => {},
      removeItem: () => {},
      increment: () => {},
      decrement: () => {},
      setQuantity: () => {},
      clearCart: () => {},
      getQuantity: () => 0,
      getProductQuantity: () => 0,
      hasItem: () => false,
      setHasGiftNote: () => {},
      setGiftNote: () => {},
      setIsDrawerOpen: () => {},
      openCartDrawer: () => {},
      closeCartDrawer: () => {},
    };
  }
  return ctx;
}
