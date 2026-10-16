import CartPageClient from "./CartPageClient";

export const metadata = {
  title: "Shopping Cart | The Indulgent Spoon",
  description: "Review and customize your fresh artisanal bakery cart from The Indulgent Spoon.",
  alternates: {
    canonical: "/cart",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartPage() {
  return <CartPageClient />;
}
