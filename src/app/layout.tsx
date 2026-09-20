import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Indulgent Spoon — Artisanal Bakery & Patisserie",
  description:
    "Order handcrafted fresh sourdough, zero-sugar spreads, and decadent desserts. 100% eggless products made fresh on order.",
  keywords: ["The Indulgent Spoon", "Artisanal Bakery", "Fresh Sourdough", "No Sugar Spreads", "Eggless Desserts", "Order Online"],
  icons: {
    icon: [
      { url: "/logo-m.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/logo-m.png",
    apple: "/logo-m.png",
  },
  openGraph: {
    title: "The Indulgent Spoon — Artisanal Bakery",
    description: "Handcrafted fresh sourdough, zero-sugar spreads, and 100% eggless desserts.",
    type: "website",
    images: [{ url: "/logo-m.png" }],
  },
};

import { CartProvider } from "@/lib/store/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/logo-m.png?v=3" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-m.png?v=3" />
        <link rel="apple-touch-icon" href="/logo-m.png?v=3" />
      </head>
      <body className="min-h-full flex flex-col bg-[#D9BC9E] text-[#29251F] font-sans selection:bg-[#C26B59] selection:text-[#F5EBDD]">
        <CartProvider restaurantSlug="the-indulgent-spoon">
          <CartDrawer />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
