"use client";

import dynamic from "next/dynamic";
import { useCart } from "@/lib/store/CartContext";

const LazyCartDrawer = dynamic(
  () => import("./CartDrawer").then((mod) => mod.CartDrawer),
  { ssr: false }
);

export function CartDrawerContainer() {
  const { isDrawerOpen } = useCart();

  if (!isDrawerOpen) {
    return null;
  }

  return <LazyCartDrawer />;
}
