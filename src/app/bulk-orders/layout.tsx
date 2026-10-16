import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Orders & Corporate Gifting",
  description:
    "Order customized artisanal bakery hampers, sourdough gift boxes, and gourmet dessert packages for weddings, corporate gifting, and special celebrations across Delhi NCR.",
  alternates: {
    canonical: "/bulk-orders",
  },
  openGraph: {
    title: "Bulk Orders & Corporate Gifting | The Indulgent Spoon",
    description:
      "Order customized artisanal bakery hampers, sourdough gift boxes, and gourmet dessert packages for weddings, corporate gifting, and special celebrations across Delhi NCR.",
    url: "https://www.theindulgentspoon.in/bulk-orders",
    images: [
      {
        url: "/main_photo_f.jpeg",
        width: 1200,
        height: 630,
        alt: "The Indulgent Spoon Bulk Orders and Gifting",
      },
    ],
  },
};

export default function BulkOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
