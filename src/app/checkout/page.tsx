import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header cartCount={0} />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24">
        <h1 className="font-serif text-3xl font-bold text-[#29251F] mb-2">
          Checkout
        </h1>
        <p className="text-sm text-[#696053] mb-8">
          Choose Delivery or Takeaway and complete your order via WhatsApp.
        </p>

        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] p-8 shadow-warm-sm">
          <p className="text-sm text-[#29251F]/80">
            For direct live orders, visit our store menu to add freshly prepared dishes to your bag and proceed to WhatsApp checkout.
          </p>
          <div className="mt-6">
            <Link href="/store/the-indulgent-spoon">
              <Button variant="cta" size="sm">
                Explore Store Menu
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
