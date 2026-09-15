export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  badge: string;
  badgeVariant: "bestseller" | "special" | "default" | "fresh" | "indulgent" | "chilled";
  image: string;
  prepTime: string;
  aspectRatio: string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "1",
    name: "Royal Chicken Dum Biryani",
    description:
      "Fragrant 2-year aged basmati layered with succulent farm chicken, caramel brown onions, saffron threads, and pot-sealed on low dum. Served with seasoned burani raita and spicy salan.",
    price: 349,
    category: "Biryani",
    badge: "Bestseller",
    badgeVariant: "bestseller",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
    prepTime: "25 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "2",
    name: "Smoked Paneer Tikka",
    description:
      "Hand-pressed artisanal cottage cheese steeped in Kashmiri red chilli, cold-pressed mustard oil, hung curd, and roasted over natural charcoal. Finished with roasted spices and mint chutney.",
    price: 289,
    category: "Starters",
    badge: "Chef's Special",
    badgeVariant: "special",
    image:
      "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
    prepTime: "20 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "3",
    name: "Old Delhi Butter Chicken",
    description:
      "Charcoal roasted tandoori chicken simmered slowly in a rich velvet satin makhani sauce infused with fresh butter and sun-dried fenugreek. Served with warm butter garlic naan.",
    price: 389,
    category: "Main Course",
    badge: "Popular",
    badgeVariant: "default",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
    prepTime: "25 min",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "4",
    name: "Artisanal Butter Croissant",
    description:
      "Folded with 72 gossamer layers of pure cultured European butter. Hand-laminated, slow-proofed, and baked golden every sunrise. Crisp exterior with airy, honeycomb interior.",
    price: 169,
    category: "Bakery",
    badge: "Freshly Baked",
    badgeVariant: "fresh",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80",
    prepTime: "Daily Batch",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "5",
    name: "Belgium Truffle Brownie",
    description:
      "Dense, molten center crafted from 70% single-origin Belgian dark chocolate, topped with house-made salted caramel and toasted pecans. Served warm with vanilla bean cream.",
    price: 199,
    category: "Desserts",
    badge: "Indulgent",
    badgeVariant: "indulgent",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
    prepTime: "Warm Serve",
    aspectRatio: "aspect-[4/3]",
  },
  {
    id: "6",
    name: "Signature Cold Brew Coffee",
    description:
      "Single-estate Arabica beans coarse-ground and slow-steeped for 18 hours in cold filtered spring water. Poured over ice with whole milk or plant-based oat milk upon request.",
    price: 159,
    category: "Beverages",
    badge: "Chilled",
    badgeVariant: "chilled",
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80",
    prepTime: "Instant Serve",
    aspectRatio: "aspect-[4/3]",
  },
];
