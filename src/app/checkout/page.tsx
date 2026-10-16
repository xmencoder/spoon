import CheckoutPageClient from "./CheckoutPageClient";

export const metadata = {
  title: "Checkout | The Indulgent Spoon",
  description: "Complete your fresh bakery order from The Indulgent Spoon.",
  alternates: {
    canonical: "/checkout",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
