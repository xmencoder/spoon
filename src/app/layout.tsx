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
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://theindulgentspoon.in"),
  title: {
    default: "The Indulgent Spoon | Cakes, Desserts & Bakery",
    template: "%s | The Indulgent Spoon",
  },
  description:
    "Discover delicious cakes, desserts and bakery treats from The Indulgent Spoon. Explore our menu and order online for delivery across our service areas in Delhi NCR.",
  keywords: [
    "The Indulgent Spoon",
    "Cakes Delhi NCR",
    "Bakery Gurgaon",
    "Desserts Gurugram",
    "Online Cake Delivery Delhi NCR",
    "Artisanal Bakery",
    "Fresh Sourdough",
    "Eggless Cakes",
    "Birthday Cakes Gurgaon",
    "Dessert Delivery Delhi NCR",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logo-m.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/logo-m.png",
    apple: "/logo-m.png",
  },
  openGraph: {
    title: "The Indulgent Spoon | Cakes, Desserts & Bakery",
    description:
      "Discover delicious cakes, desserts and bakery treats from The Indulgent Spoon. Explore our menu and order online for delivery across our service areas in Delhi NCR.",
    url: "https://theindulgentspoon.in",
    siteName: "The Indulgent Spoon",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/main_photo_f.jpeg",
        width: 1200,
        height: 630,
        alt: "The Indulgent Spoon artisanal bakery cakes, sourdough, and desserts spread",
      },
      {
        url: "/logo-brand.png",
        width: 800,
        height: 800,
        alt: "The Indulgent Spoon Brand Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Indulgent Spoon | Cakes, Desserts & Bakery",
    description:
      "Discover delicious cakes, desserts and bakery treats from The Indulgent Spoon. Explore our menu and order online for delivery across our service areas in Delhi NCR.",
    images: ["/main_photo_f.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "X6k3h0bfS-SgNyNDAqkoI-z_KXkcp_MuUANJcDyD-7E",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "The Indulgent Spoon",
  alternateName: "Indulgent Spoon",
  url: "https://theindulgentspoon.in",
};

const bakeryJsonLd = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  name: "The Indulgent Spoon",
  alternateName: "Indulgent Spoon",
  description:
    "Artisanal bakery and cloud kitchen crafting fresh cakes, sourdough bread, muffins, zero-sugar spreads, and gourmet desserts.",
  url: "https://theindulgentspoon.in",
  logo: "https://theindulgentspoon.in/logo-m.png",
  image: "https://theindulgentspoon.in/main_photo_f.jpeg",
  telephone: "+91 9717123510",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Sector 14",
    addressLocality: "Rewari",
    addressRegion: "Haryana",
    addressCountry: "IN",
  },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Delhi NCR" },
    { "@type": "City", name: "Gurgaon" },
    { "@type": "City", name: "Gurugram" },
    { "@type": "City", name: "Delhi" },
    { "@type": "City", name: "Noida" },
    { "@type": "City", name: "Faridabad" },
    { "@type": "City", name: "Rewari" },
  ],
  priceRange: "₹₹",
  servesCuisine: [
    "Bakery",
    "Cakes",
    "Desserts",
    "Sourdough",
    "Eggless Bakery",
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "11:00",
      closes: "23:00",
    },
  ],
  hasMenu: "https://theindulgentspoon.in/full-menu",
};

import dynamic from "next/dynamic";
import { CartProvider } from "@/lib/store/CartContext";

const CartDrawer = dynamic(
  () => import("@/components/cart/CartDrawer").then((mod) => mod.CartDrawer)
);

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
        <meta
          name="google-site-verification"
          content="X6k3h0bfS-SgNyNDAqkoI-z_KXkcp_MuUANJcDyD-7E"
        />
        <link rel="icon" href="/logo-m.png?v=3" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-m.png?v=3" />
        <link rel="apple-touch-icon" href="/logo-m.png?v=3" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bakeryJsonLd) }}
        />
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
