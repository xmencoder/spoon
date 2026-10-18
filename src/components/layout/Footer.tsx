import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed, ArrowUpRight } from "lucide-react";

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

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
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
            <h3 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-[#29251F]">
              Explore
            </h3>
            <ul className="space-y-2.5 text-xs font-medium uppercase tracking-wider text-[#4D4537]">
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
            <h3 className="font-serif text-sm font-bold uppercase tracking-[0.18em] text-[#29251F]">
              Connect With Us
            </h3>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4D4537] block">
                      Instagram
                    </span>
                    <span className="text-xs font-bold text-[#29251F] group-hover:text-[#C26B59] transition-colors">
                      @the.indulgent.spoon
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#4D4537] group-hover:text-[#C26B59] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/919717123510?text=Hi%20The%20Indulgent%20Spoon!%20I'd%20like%20to%20place%20an%20order%20%F0%9F%8D%B0"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5EBDD]/70 border border-[#91885D]/30 hover:border-[#25D366]/50 hover:bg-[#F5EBDD] transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#128C7E] group-hover:scale-105 transition-transform">
                    <WhatsAppIcon className="h-4.5 w-4.5 text-[#128C7E]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4D4537] block">
                      WhatsApp / Orders
                    </span>
                    <span className="text-xs font-bold text-[#29251F] group-hover:text-[#128C7E] transition-colors">
                      +91 97171 23510
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#128C7E] bg-[#25D366]/15 border border-[#25D366]/30 px-2.5 py-0.5 rounded-full">
                  Chat
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Decorative Brand Divider */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#91885D]/40 to-[#91885D]/40" />
          <div className="flex items-center gap-3 text-[#91885D]">
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#4D4537]">Est. 2025</span>
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/logo_stamp.png"
                alt="The Indulgent Spoon"
                fill
                className="object-contain opacity-80"
                sizes="32px"
              />
            </div>
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#4D4537]">The Indulgent Spoon</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#91885D]/40 to-[#91885D]/40" />
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center text-xs text-[#4D4537]">
          &copy; 2025 The Indulgent Spoon. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
