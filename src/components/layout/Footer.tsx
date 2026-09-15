import Link from "next/link";
import { UtensilsCrossed, MessageCircle, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#91885D]/30 bg-[#E8D5BC] py-16 text-[#29251F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4 pr-0 md:pr-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5EBDD] border border-[#91885D]/40 text-[#C26B59] shadow-2xs">
                <UtensilsCrossed className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="font-serif text-xl font-bold uppercase tracking-wider text-[#29251F] block">
                  The Indulgent Spoon
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#696053]">
                  Artisanal Kitchen & Delicacies
                </span>
              </div>
            </div>
            <p className="text-sm text-[#29251F]/85 leading-relaxed">
              Curated artisanal recipes cooked with fresh wholesome ingredients.
              Experience cloud-kitchen gourmet delivered right to your doorstep,
              ordered conveniently through WhatsApp.
            </p>
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#91885D]/30 bg-[#F5EBDD] px-3.5 py-2 text-xs font-semibold text-[#29251F] shadow-2xs">
                <MessageCircle className="h-4 w-4 text-[#91885D]" strokeWidth={1.75} />
                <span>WhatsApp Ordering Supported</span>
              </div>
            </div>
          </div>

          {/* Separator on desktop */}
          <div className="hidden md:block md:col-span-1 border-r border-[#91885D]/30 h-full" />

          {/* Nav Col */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-[#29251F]">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs font-medium uppercase tracking-wider text-[#696053]">
              <li>
                <Link href="/#menu" className="hover:text-[#C26B59] transition-colors font-semibold text-[#29251F]">
                  Menu & Categories
                </Link>
              </li>
              <li>
                <Link href="/store/the-indulgent-spoon/cart" className="hover:text-[#C26B59] transition-colors">
                  Your Cart
                </Link>
              </li>
              <li>
                <Link href="/store/the-indulgent-spoon/checkout" className="hover:text-[#C26B59] transition-colors">
                  Direct Checkout
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-[#C26B59] transition-colors">
                  Kitchen Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Inquiries Col */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-[#29251F]">
              Kitchen Inquiries
            </h4>
            <div className="space-y-2.5 text-sm text-[#29251F]/80">
              <p className="leading-relaxed text-xs">
                Fresh batches prepared daily using slow-cooking traditions and premium spices.
              </p>
              <div className="text-xs pt-1">
                <span className="font-semibold text-[#29251F] block">Kitchen Hours:</span>
                <span>11:00 AM – 11:00 PM Daily</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Brand Divider */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#91885D]/40 to-[#91885D]/40" />
          <div className="flex items-center gap-2 text-[#91885D]">
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#696053]">Est. 2024</span>
            <Sparkles className="h-3.5 w-3.5 text-[#C26B59]" strokeWidth={1.75} />
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#696053]">The Indulgent Spoon</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#91885D]/40 to-[#91885D]/40" />
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center text-xs text-[#696053]">
          &copy; {new Date().getFullYear()} The Indulgent Spoon. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
