export interface IngredientItem {
  name: string;
  image: string;
}

export interface FeatureBadge {
  id: string;
  icon: "leaf" | "butter" | "chips" | "heart" | "wheat" | "clock" | "award";
  label: string;
}

export interface ProductSizeOption {
  id: string;
  label: string;
  price?: number;
  isDefault?: boolean;
}

export interface ProductAddonOption {
  id: string;
  label: string;
  price: number;
  icon?: string;
}

// 1. Tea Cakes: Size 350 gms; Add-ons: Birthday +40, Message card +20, Candle +40
export const TEA_CAKE_SIZES: ProductSizeOption[] = [
  { id: "size-350g", label: "350 gms", isDefault: true },
];

export const TEA_CAKE_ADDONS: ProductAddonOption[] = [
  { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
  { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
  { id: "candle", label: "Celebration Candle", price: 40, icon: "🕯️" },
];

// 2. Muffins: Pack of 4 -> 500, Pack of 8 -> 1000, Pack of 12 -> 1500
// Add-ons: Birthday -> 40, Message card -> 20, Candles -> 40, Gift box -> 40
export const MUFFIN_PACKS: ProductSizeOption[] = [
  { id: "pack-4", label: "Pack of 4", price: 500, isDefault: true },
  { id: "pack-8", label: "Pack of 8", price: 1000 },
  { id: "pack-12", label: "Pack of 12", price: 1500 },
];

export const MUFFIN_ADDONS: ProductAddonOption[] = [
  { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
  { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
  { id: "candles", label: "Celebration Candles", price: 40, icon: "🕯️" },
  { id: "gift-box", label: "Gift Box", price: 40, icon: "🎁" },
];

// 3. Spreads: Size 240 gm; Add-ons same as Tea Cake
export const SPREAD_SIZES: ProductSizeOption[] = [
  { id: "size-240g", label: "240 gm", isDefault: true },
];

export const SPREAD_ADDONS: ProductAddonOption[] = [];

// 4. Sourdough: Add-ons ONLY Wholewheat -> +100 rs
export const SOURDOUGH_SIZES: ProductSizeOption[] = [
  { id: "loaf-500g", label: "Artisanal Loaf (500g)", isDefault: true },
];

export const SOURDOUGH_ADDONS: ProductAddonOption[] = [
  { id: "wholewheat", label: "Wholewheat", price: 100, icon: "🌾" },
];

export interface BakeryProductDetail {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  category: string;
  categorySlug: string;
  sizes?: ProductSizeOption[];
  addons?: ProductAddonOption[];
  badge?: string;
  tags?: string[];
  doodleTopRight?: string;
  imageScript?: string;
  rating: number;
  reviewCount: string;
  mainImage: string;
  galleryImages: string[];
  storyTitle: string;
  storyText: string;
  quote: string;
  featureBadges: FeatureBadge[];
  ingredients: IngredientItem[];
  allergenInfo: string[];
  storageCare: string[];
  recommendedIds: string[];
}

export const INGREDIENT_IMAGES: Record<string, string> = {
  wheatFlour:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=80",
  realButter:
    "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=160&auto=format&fit=crop&q=80",
  brownSugar:
    "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=160&auto=format&fit=crop&q=80",
  chocoChips:
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=160&auto=format&fit=crop&q=80",
  eggs:
    "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=160&auto=format&fit=crop&q=80",
  milk:
    "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=160&auto=format&fit=crop&q=80",
  vanillaExtract:
    "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=160&auto=format&fit=crop&q=80",
  bakingEssentials:
    "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=160&auto=format&fit=crop&q=80",
};

export const STANDARD_INGREDIENTS: IngredientItem[] = [
  { name: "Wheat Flour", image: INGREDIENT_IMAGES.wheatFlour },
  { name: "Real Butter", image: INGREDIENT_IMAGES.realButter },
  { name: "Brown Sugar", image: INGREDIENT_IMAGES.brownSugar },
  { name: "Choco Chips", image: INGREDIENT_IMAGES.chocoChips },
  { name: "Eggs", image: INGREDIENT_IMAGES.eggs },
  { name: "Milk", image: INGREDIENT_IMAGES.milk },
  { name: "Vanilla Extract", image: INGREDIENT_IMAGES.vanillaExtract },
  { name: "Baking Essentials", image: INGREDIENT_IMAGES.bakingEssentials },
];

export const BAKERY_PRODUCTS: Record<string, BakeryProductDetail> = {
  "og-choco-chip-butter-cake": {
    id: "og-choco-chip-butter-cake",
    name: "OG Choco Chip Butter Cake",
    subtitle: "Soft, buttery & loaded with choco chips. The Nanz Original.",
    price: 900,
    category: "Cakes",
    categorySlug: "tea-cake",
    sizes: TEA_CAKE_SIZES,
    addons: TEA_CAKE_ADDONS,
    badge: "BESTSELLER",
    doodleTopRight: "Good Desserts Happier Days ♡",
    imageScript: "A slice of happiness ♡",
    rating: 4.8,
    reviewCount: "1.2k reviews",
    mainImage:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake",
    storyText:
      "Our OG Choco Chip Butter Cake is a timeless classic. Rich, moist, and buttery, it's generously packed with premium chocolate chips in every bite. Baked fresh with love, it's comfort in its purest form.",
    quote: "Some classics never go out of style.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Made with Real Butter" },
      { id: "3", icon: "chips", label: "Loaded with Choco Chips" },
      { id: "4", icon: "heart", label: "Freshly Baked to Order" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Pure Butter & Milk), Soy Lecithin (in Chocolate).",
      "100% Eggless variant available — crafted with pure organic flaxseed & fresh cultured curd upon request.",
      "Prepared in a dedicated boutique kitchen that handles tree nuts (almonds, walnuts, pistachios).",
      "Zero artificial preservatives, zero palm oil, zero chemical food coloring.",
    ],
    storageCare: [
      "Room Temperature: Store in an airtight container in a cool, dry place for up to 3–4 days.",
      "Refrigeration: Keeps delightfully moist in the refrigerator for up to 7 days.",
      "Chef's Secret: Microwave a slice for 10–15 seconds before eating for an irresistible, gooey melted chocolate core!",
    ],
    recommendedIds: [
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "biscoff-cheesecake",
      "assorted-cookie-tin",
    ],
  },
  "intense-chocolate-butter-cake": {
    id: "intense-chocolate-butter-cake",
    name: "Intense Chocolate Butter Cake",
    subtitle: "Soft, buttery & intensely chocolatey. Made for true chocoholics.",
    price: 999,
    category: "Cakes",
    categorySlug: "tea-cake",
    sizes: TEA_CAKE_SIZES,
    addons: TEA_CAKE_ADDONS,
    badge: "POPULAR",
    doodleTopRight: "Pure Chocolate Bliss ♡",
    imageScript: "Rich & Decadent ♡",
    rating: 4.9,
    reviewCount: "980 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake",
    storyText:
      "Intensely dark, deeply fudgy, and packed with Belgian couverture cocoa. Every bite melts on your tongue with velvety smoothness and rich cocoa aroma.",
    quote: "You can't buy happiness, but you can buy chocolate cake.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Made with Real Butter" },
      { id: "3", icon: "chips", label: "Belgian Couverture Cocoa" },
      { id: "4", icon: "heart", label: "Freshly Baked to Order" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter & Cream), Soy Lecithin.",
      "100% Eggless available on request.",
      "Handcrafted in a boutique kitchen handling nuts.",
    ],
    storageCare: [
      "Room Temperature: 3–4 days in an airtight tin.",
      "Refrigerate: Up to 7 days.",
      "Warm for 12 seconds in microwave for molten bliss.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "biscoff-cheesecake",
      "assorted-cookie-tin",
    ],
  },
  "red-velvet-cake": {
    id: "red-velvet-cake",
    name: "Red Velvet Cream Cheese Cake",
    subtitle: "Velvety scarlet crumb with luscious Madagascan cream cheese frosting.",
    price: 950,
    category: "Cakes",
    categorySlug: "tea-cake",
    sizes: TEA_CAKE_SIZES,
    addons: TEA_CAKE_ADDONS,
    badge: "BESTSELLER",
    doodleTopRight: "Love in Every Bite ♡",
    imageScript: "Velvety perfection ♡",
    rating: 4.8,
    reviewCount: "840 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake",
    storyText:
      "Our iconic Red Velvet is delicately tender with a hint of natural cocoa and cultured buttermilk. Crowned with velvety Madagascar vanilla cream cheese frosting.",
    quote: "A velvet touch that brightens every celebration.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Real Cream Cheese" },
      { id: "3", icon: "chips", label: "Dutch Cocoa Blend" },
      { id: "4", icon: "heart", label: "Freshly Baked to Order" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Cream Cheese & Butter).",
      "100% Eggless available.",
    ],
    storageCare: [
      "Refrigeration: Store in the fridge for up to 5 days.",
      "Serve chilled or let rest for 10 minutes at room temperature.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "lemon-drizzle-cake",
      "biscoff-cheesecake",
      "assorted-cookie-tin",
    ],
  },
  "lemon-drizzle-cake": {
    id: "lemon-drizzle-cake",
    name: "Lemon Drizzle Cake",
    subtitle: "A zesty classic soaked with Meyer lemon syrup for bright days.",
    price: 799,
    category: "Cakes",
    categorySlug: "tea-cake",
    sizes: TEA_CAKE_SIZES,
    addons: TEA_CAKE_ADDONS,
    badge: "NEW!",
    doodleTopRight: "Sunlit Morning Zest ♡",
    imageScript: "Zesty sunshine ♡",
    rating: 4.7,
    reviewCount: "620 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake",
    storyText:
      "Baked with freshly grated Meyer lemon zest and drenched in hot artisanal lemon sugar syrup the second it emerges from the oven. Tender, moist, and delightfully bright.",
    quote: "When life gives you lemons, bake a drizzle cake.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "Fresh Lemon Zest" },
      { id: "2", icon: "butter", label: "Made with Real Butter" },
      { id: "3", icon: "chips", label: "Meyer Lemon Drizzle" },
      { id: "4", icon: "heart", label: "Freshly Baked to Order" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter & Milk).",
      "100% Eggless available.",
    ],
    storageCare: [
      "Room temperature: 4 days in an airtight tin.",
      "Pair with hot Earl Grey or Darjeeling tea for the ultimate tea time.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "biscoff-cheesecake",
      "assorted-cookie-tin",
    ],
  },
  "biscoff-cheesecake": {
    id: "biscoff-cheesecake",
    name: "Biscoff Cheesecake",
    subtitle: "Creamy baked New York style cheesecake with Lotus Biscoff swirl.",
    price: 950,
    category: "Cakes",
    categorySlug: "tea-cake",
    badge: "POPULAR",
    doodleTopRight: "Caramelized Wonder ♡",
    imageScript: "Caramelized bliss ♡",
    rating: 4.9,
    reviewCount: "1.1k reviews",
    mainImage:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake",
    storyText:
      "A buttery Lotus Biscoff speculoos cookie crust layered with ultra-creamy Philadelphia cream cheese, crowned with molten Biscoff spread and cookie crumbs.",
    quote: "Spiced caramelized cookie magic in every bite.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Lotus Biscoff Spread" },
      { id: "3", icon: "chips", label: "Speculoos Crust" },
      { id: "4", icon: "heart", label: "Freshly Chilled" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Cream Cheese & Cream), Soy (in Biscoff).",
    ],
    storageCare: [
      "Keep refrigerated at all times (up to 5 days).",
      "Serve chilled directly from the fridge.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "assorted-cookie-tin",
    ],
  },
  "assorted-cookie-tin": {
    id: "assorted-cookie-tin",
    name: "Assorted Cookie Tin",
    subtitle: "3-in-1 collectible tin: OG Choco Chip • Red Velvet • Double Choco Chip.",
    price: 699,
    category: "Gift Boxes",
    categorySlug: "gift-boxes",
    badge: "BESTSELLER",
    doodleTopRight: "Happiness in a Tin ♡",
    imageScript: "Crisp & Chewy ♡",
    rating: 4.9,
    reviewCount: "1.4k reviews",
    mainImage:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Tin",
    storyText:
      "Handcrafted butter cookies baked golden in small batches. Packed in an antique keepsake vintage tin that seals in oven freshness and makes an unforgettable gift.",
    quote: "A cookie a day keeps sadness away.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Pure European Butter" },
      { id: "3", icon: "chips", label: "Hand-Rolled Dough" },
      { id: "4", icon: "heart", label: "Collectible Tin" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter), Soy.",
      "100% Eggless cookies.",
    ],
    storageCare: [
      "Airtight tin keeps cookies crisp for up to 3 weeks.",
      "Store away from direct sunlight.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "biscoff-cheesecake",
    ],
  },
  "belgian-truffle-cake-jar": {
    id: "belgian-truffle-cake-jar",
    name: "Belgian Truffle Cake Jar",
    subtitle:
      "Layers of moist dark chocolate sponge and rich 55% Belgian chocolate ganache.",
    price: 280,
    category: "Cake Jars",
    categorySlug: "cake-jars",
    badge: "BESTSELLER",
    doodleTopRight: "Chocolate in a Jar ♡",
    imageScript: "Pure spoonable luxury ♡",
    rating: 4.9,
    reviewCount: "1.3k reviews",
    mainImage:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Cake Jar",
    storyText:
      "Generously layered in an artisanal glass jar with fluffy dark cocoa sponge soaked in cocoa syrup and smothered with velvety Belgian chocolate truffle ganache. Portable, indulgent, and pure perfection by the spoonful.",
    quote: "Happiness is spooning into a warm chocolate truffle jar.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "chips", label: "55% Belgian Chocolate" },
      { id: "3", icon: "butter", label: "Pure Dairy Cream" },
      { id: "4", icon: "heart", label: "Freshly Made Daily" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Cream & Butter), Soy Lecithin.",
      "100% Eggless recipe.",
      "May contain traces of tree nuts.",
    ],
    storageCare: [
      "Keep refrigerated; best enjoyed chilled or slightly warm.",
      "Keeps fresh for up to 7 days in the sealed jar.",
      "Pro tip: Microwave for 10 seconds for a warm molten lava jar experience!",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "biscoff-cheesecake",
    ],
  },
  "wild-blueberry-muffin": {
    id: "wild-blueberry-muffin",
    name: "Wild Blueberry Streusel Muffin",
    subtitle:
      "Bursting with juicy wild blueberries and crowned with crispy brown sugar streusel.",
    price: 500,
    category: "Muffins",
    categorySlug: "muffins",
    sizes: MUFFIN_PACKS,
    addons: MUFFIN_ADDONS,
    badge: "BESTSELLER",
    doodleTopRight: "Berry Delight ♡",
    imageScript: "Berry bliss in every bite ♡",
    rating: 4.8,
    reviewCount: "720 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Muffin",
    storyText:
      "Crafted with hand-picked wild blueberries and slow-baked for a super-tender golden crumb topped with a crisp cinnamon streusel crown.",
    quote: "Fresh berries make every morning sweeter.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "Real Blueberries" },
      { id: "2", icon: "butter", label: "Golden Butter Crumb" },
      { id: "3", icon: "chips", label: "Crisp Streusel" },
      { id: "4", icon: "heart", label: "Freshly Baked" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter & Milk).",
      "100% Eggless variant available upon request.",
      "Handcrafted in a boutique kitchen handling tree nuts.",
    ],
    storageCare: [
      "Store at room temperature in an airtight box for up to 3 days.",
      "Warm in microwave for 10 seconds before eating for freshly baked fluffiness.",
    ],
    recommendedIds: [
      "belgian-double-choco-muffin",
      "og-choco-chip-butter-cake",
      "lemon-drizzle-cake",
    ],
  },
  "belgian-double-choco-muffin": {
    id: "belgian-double-choco-muffin",
    name: "Double Belgian Choco Muffin",
    subtitle:
      "Rich dark chocolate muffin loaded with gooey Belgian chocolate molten drops.",
    price: 500,
    category: "Muffins",
    categorySlug: "muffins",
    sizes: MUFFIN_PACKS,
    addons: MUFFIN_ADDONS,
    badge: "POPULAR",
    doodleTopRight: "Molten Core Magic ♡",
    imageScript: "Double chocolate heaven ♡",
    rating: 4.9,
    reviewCount: "890 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Muffin",
    storyText:
      "Loaded with double couverture Belgian cocoa and bursting with molten chocolate chips in every bite. Intensely chocolatey and cloud-soft.",
    quote: "Double the chocolate, double the happiness.",
    featureBadges: [
      { id: "1", icon: "chips", label: "Belgian Couverture" },
      { id: "2", icon: "butter", label: "Pure Dairy Butter" },
      { id: "3", icon: "heart", label: "Freshly Baked" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter & Milk), Soy Lecithin.",
      "100% Eggless available upon request.",
      "May contain traces of tree nuts.",
    ],
    storageCare: [
      "Store at room temperature in an airtight box for up to 3 days.",
      "Microwave for 12 seconds for molten lava chocolate drops.",
    ],
    recommendedIds: [
      "wild-blueberry-muffin",
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
    ],
  },
  "zero-sugar-hazelnut-spread": {
    id: "zero-sugar-hazelnut-spread",
    name: "Zero-Sugar Roasted Hazelnut Spread",
    subtitle:
      "Pure stone-ground Turkish hazelnuts blended with raw cacao and monkfruit sweetener.",
    price: 480,
    category: "Spreads",
    categorySlug: "spreads",
    sizes: SPREAD_SIZES,
    addons: SPREAD_ADDONS,
    badge: "POPULAR",
    doodleTopRight: "Guilt-Free Indulgence ♡",
    imageScript: "70% Roasted Hazelnuts ♡",
    rating: 4.9,
    reviewCount: "540 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Spread",
    storyText:
      "Stone-ground in small batches with 70% slow-roasted Turkish hazelnuts, organic cocoa butter, and plant-based monkfruit. Silky smooth, luscious, and 100% refined sugar-free.",
    quote: "Guilt-free chocolate luxury by the spoonful.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "Zero Refined Sugar" },
      { id: "2", icon: "chips", label: "70% Hazelnuts" },
      { id: "3", icon: "heart", label: "Keto Friendly" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Tree Nuts (Hazelnuts), Dairy (Milk Solids).",
      "100% Refined Sugar-Free & Keto Friendly.",
      "Zero palm oil, zero artificial preservatives.",
    ],
    storageCare: [
      "Store in a cool, dry place. Oil separation is natural; stir before use.",
      "Do not refrigerate to maintain spreadability.",
    ],
    recommendedIds: [
      "artisanal-salted-caramel-spread",
      "country-sourdough-batard",
      "og-choco-chip-butter-cake",
    ],
  },
  "artisanal-salted-caramel-spread": {
    id: "artisanal-salted-caramel-spread",
    name: "Artisanal Fleur de Sel Caramel",
    subtitle:
      "Slow-caramelized dairy cream simmered with Madagascar vanilla and mineral-rich sea salt.",
    price: 390,
    category: "Spreads",
    categorySlug: "spreads",
    sizes: SPREAD_SIZES,
    addons: SPREAD_ADDONS,
    badge: "NEW!",
    doodleTopRight: "Buttery & Golden ♡",
    imageScript: "Slow-caramelized perfection ♡",
    rating: 4.8,
    reviewCount: "410 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Spread",
    storyText:
      "Slow-simmered pure butter and heavy dairy cream kissed with Madagascan Bourbon vanilla and hand-harvested Fleur de Sel salt. Drizzle over warm pancakes, sourdough, or enjoy straight from the jar.",
    quote: "Golden caramel magic for your breakfast table.",
    featureBadges: [
      { id: "1", icon: "butter", label: "Pure Dairy Cream" },
      { id: "2", icon: "leaf", label: "Fleur de Sel" },
      { id: "3", icon: "heart", label: "Handcrafted" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Dairy (Butter & Fresh Cream).",
      "100% Vegetarian recipe.",
      "Zero chemical additives.",
    ],
    storageCare: [
      "Store at room temperature or refrigerate for up to 4 weeks.",
      "Warm slightly to loosen texture for drizzling.",
    ],
    recommendedIds: [
      "zero-sugar-hazelnut-spread",
      "wild-blueberry-muffin",
      "og-choco-chip-butter-cake",
    ],
  },
  "country-sourdough-batard": {
    id: "country-sourdough-batard",
    name: "Artisanal Country Sourdough",
    subtitle:
      "36-hour slow fermented wild yeast sourdough with blistered caramel crust and open crumb.",
    price: 290,
    category: "Sourdough",
    categorySlug: "sourdough",
    sizes: SOURDOUGH_SIZES,
    addons: SOURDOUGH_ADDONS,
    badge: "BESTSELLER",
    doodleTopRight: "Wild Ferment ♡",
    imageScript: "Crispy crust & open crumb ♡",
    rating: 4.9,
    reviewCount: "820 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Sourdough",
    storyText:
      "Naturally leavened with our decade-old sourdough starter. Fermented for 36 hours for rich depth of flavor and easy digestion.",
    quote: "Good bread takes time, patience, and wild air.",
    featureBadges: [],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten).",
      "100% Naturally Vegan, zero commercial yeast, zero dairy.",
    ],
    storageCare: [
      "Keep cut-side down on a wooden cutting board for 2 days, or in a linen bag.",
      "Toast slices for 2–3 minutes for optimal crunch.",
    ],
    recommendedIds: [
      "zero-sugar-hazelnut-spread",
      "artisanal-salted-caramel-spread",
    ],
  },
  "olive-rosemary-sourdough": {
    id: "olive-rosemary-sourdough",
    name: "Kalamata Olive & Rosemary Sourdough",
    subtitle:
      "Infused with organic Tuscan extra virgin olive oil, fragrant rosemary, and Greek Kalamata olives.",
    price: 340,
    category: "Sourdough",
    categorySlug: "sourdough",
    sizes: SOURDOUGH_SIZES,
    addons: SOURDOUGH_ADDONS,
    badge: "NEW!",
    doodleTopRight: "Mediterranean Magic ♡",
    imageScript: "Fragrant & Savory ♡",
    rating: 4.8,
    reviewCount: "390 reviews",
    mainImage:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Sourdough",
    storyText:
      "Studded with plump Greek Kalamata olives and fresh garden rosemary, folded into our signature slow-fermented sourdough dough.",
    quote: "A savory slice of Mediterranean warmth.",
    featureBadges: [],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten).",
      "100% Vegan, zero dairy.",
    ],
    storageCare: [
      "Store in a breathable bread bag for up to 3 days.",
      "Re-crisp in oven at 180°C for 5 minutes.",
    ],
    recommendedIds: [
      "country-sourdough-batard",
      "zero-sugar-hazelnut-spread",
    ],
  },
};

// Also list the 5 recommended items for "You May Also Like"
export const RECOMMENDED_PRODUCTS = [
  {
    id: "intense-chocolate-butter-cake",
    name: "Intense Chocolate Butter Cake",
    price: 999,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "red-velvet-cake",
    name: "Red Velvet Cake",
    price: 950,
    image:
      "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "lemon-drizzle-cake",
    name: "Lemon Drizzle Cake",
    price: 799,
    image:
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "biscoff-cheesecake",
    name: "Biscoff Cheesecake",
    price: 950,
    image:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "assorted-cookie-tin",
    name: "Assorted Cookie Tin",
    price: 699,
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80",
  },
];

/**
 * Universal resolver: Returns rich details for ANY product ID.
 */
export function getBakeryProductDetail(
  id: string,
  fallbackName?: string,
  fallbackPrice?: number,
  fallbackImage?: string,
  fallbackDesc?: string,
  fallbackCategory?: string
): BakeryProductDetail {
  const existing = BAKERY_PRODUCTS[id];
  if (existing) {
    return existing;
  }

  // Generate rich fallback detail matching the exact layout
  const name = fallbackName || "Artisanal Delight";
  const category = fallbackCategory || "Artisanal Bakery";
  const lower = `${id} ${name} ${category}`.toLowerCase();

  let sizes = TEA_CAKE_SIZES;
  let addons = TEA_CAKE_ADDONS;
  let categorySlug = "tea-cake";
  let defaultPrice = fallbackPrice || 499;

  if (lower.includes("muffin")) {
    sizes = MUFFIN_PACKS;
    addons = MUFFIN_ADDONS;
    categorySlug = "muffins";
    defaultPrice = 500;
  } else if (lower.includes("spread")) {
    sizes = SPREAD_SIZES;
    addons = SPREAD_ADDONS;
    categorySlug = "spreads";
  } else if (lower.includes("sourdough")) {
    sizes = SOURDOUGH_SIZES;
    addons = SOURDOUGH_ADDONS;
    categorySlug = "sourdough";
    defaultPrice = fallbackPrice || 290;
  }

  const price = defaultPrice;
  const image =
    fallbackImage ||
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80";

  return {
    id,
    name,
    subtitle:
      fallbackDesc ||
      "Handcrafted with pure butter and premium ingredients. Freshly baked.",
    price,
    category,
    categorySlug,
    sizes,
    addons,
    badge: "POPULAR",
    doodleTopRight: "Good Desserts Happier Days ♡",
    imageScript: "A slice of happiness ♡",
    rating: 4.8,
    reviewCount: "850 reviews",
    mainImage: image,
    galleryImages: [
      image,
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80",
    ],
    storyTitle: "A Little About This Item",
    storyText:
      fallbackDesc ||
      "Handcrafted daily by our master patissiers using time-honored slow baking methods, pure butter, and uncompromised ingredients. Comfort in its purest form.",
    quote: "Some classics never go out of style.",
    featureBadges: [
      { id: "1", icon: "leaf", label: "No Preservatives" },
      { id: "2", icon: "butter", label: "Made with Real Butter" },
      { id: "3", icon: "chips", label: "Premium Ingredients" },
      { id: "4", icon: "heart", label: "Freshly Baked to Order" },
    ],
    ingredients: STANDARD_INGREDIENTS,
    allergenInfo: [
      "Contains Wheat (Gluten), Dairy (Butter & Milk).",
      "100% Eggless variant available upon request.",
      "Handcrafted in a boutique kitchen that handles tree nuts.",
    ],
    storageCare: [
      "Room temperature: 3–4 days in an airtight box.",
      "Refrigeration: Keeps up to 7 days.",
      "Microwave for 10 seconds for warm oven freshness.",
    ],
    recommendedIds: [
      "og-choco-chip-butter-cake",
      "intense-chocolate-butter-cake",
      "red-velvet-cake",
      "lemon-drizzle-cake",
      "assorted-cookie-tin",
    ],
  };
}
