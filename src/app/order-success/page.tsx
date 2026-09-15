import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

export default function OrderSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header cartCount={0} />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 pt-20 sm:pt-24 md:pt-28 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F5EBDD] border-2 border-[#91885D]/35 text-[#91885D] shadow-warm-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#29251F]">
          Order Request Sent 🎉
        </h1>
        <p className="mt-4 text-base text-[#29251F]/80 max-w-md mx-auto leading-relaxed">
          Please wait for the restaurant to confirm your order on WhatsApp.
        </p>

        <div className="mt-8 rounded-2xl border border-[#91885D]/30 bg-[#F5EBDD] p-5 text-sm text-[#29251F] inline-flex items-center gap-3 shadow-warm-xs">
          <MessageCircle className="h-5 w-5 text-[#C26B59] shrink-0" />
          <span>Our kitchen team reviews incoming WhatsApp messages promptly.</span>
        </div>

        <div className="mt-10">
          <Link href="/">
            <Button size="lg" variant="cta">Return to Store</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
