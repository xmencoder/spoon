import OrderSuccessPageClient from "./OrderSuccessPageClient";

export const metadata = {
  title: "Order Receipt | The Indulgent Spoon",
  description: "View and download your digital bakery order receipt.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrderSuccessPage() {
  return <OrderSuccessPageClient />;
}
