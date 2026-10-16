import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed, Phone, ArrowUpRight } from "lucide-react";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#91885D]/30 bg-[#E8D5BC] py-16 text-[#29251F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4 pr-0 md:pr-6">
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
            <p className="text-sm text-[#29251F]/85 leading-relaxed max-w-md">
              Where wholesome and indulgent come together. From slow-fermented sourdough to healthier desserts and little treats worth craving, everything is made in small batches with plenty of care.
            </p>
          </div>

          {/* Quick Links Col */}
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
                <Link href="/cart" className="hover:text-[#C26B59] transition-colors">
                  Your Cart
                </Link>
              </li>
              <li>
                <Link href="/bulk-orders" className="hover:text-[#C26B59] transition-colors inline-flex items-center gap-1.5 text-[#C26B59] font-bold">
                  <span className="relative w-4 h-4 shrink-0 inline-block">
                    <Image src="/logo_stamp.png" alt="" fill className="object-contain" sizes="16px" />
                  </span>
                  <span>Bulk Orders & Gifting</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Connect Col */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-[#29251F]">
              Connect With Us
            </h4>
            <div className="space-y-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/the.indulgent.spoon/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5EBDD]/70 border border-[#91885D]/30 hover:border-[#C26B59]/40 hover:bg-[#F5EBDD] transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FD1D1D]/15 via-[#E1306C]/15 to-[#833AB4]/15 border border-[#E1306C]/30 text-[#C26B59] group-hover:scale-105 transition-transform">
                    <InstagramIcon className="h-4 w-4 text-[#C26B59]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                      Instagram
                    </span>
                    <span className="text-xs font-bold text-[#29251F] group-hover:text-[#C26B59] transition-colors">
                      @the.indulgent.spoon
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#696053] group-hover:text-[#C26B59] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </a>

              {/* Phone */}
              <a
                href="tel:9717123510"
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5EBDD]/70 border border-[#91885D]/30 hover:border-[#C26B59]/40 hover:bg-[#F5EBDD] transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5ED] border border-[#91885D]/30 text-[#C26B59] group-hover:scale-105 transition-transform">
                    <Phone className="h-4 w-4 text-[#C26B59]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                      Phone / Orders
                    </span>
                    <span className="text-xs font-bold text-[#29251F] group-hover:text-[#C26B59] transition-colors">
                      +91 97171 23510
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#C26B59] bg-[#C26B59]/10 border border-[#C26B59]/20 px-2 py-0.5 rounded-full">
                  Call
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Decorative Brand Divider */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#91885D]/40 to-[#91885D]/40" />
          <div className="flex items-center gap-3 text-[#91885D]">
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#696053]">Est. 2025</span>
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/logo_stamp.png"
                alt="The Indulgent Spoon"
                fill
                className="object-contain opacity-80"
                sizes="32px"
              />
            </div>
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#696053]">The Indulgent Spoon</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#91885D]/40 to-[#91885D]/40" />
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center text-xs text-[#696053]">
          &copy; 2025 The Indulgent Spoon. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
