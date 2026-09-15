import { CartProvider } from "@/lib/store/CartContext";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CartProvider restaurantSlug={slug}>
      {children}
    </CartProvider>
  );
}
