"use client";

import Image from "next/image";


export function FounderNoteSection() {
  return (
    <section id="founders-note" className="relative overflow-hidden bg-[#F5EBDD] py-20 sm:py-28 lg:py-32">
      {/* ── Subtle background texture / organic shapes ── */}
      {/* Top-right decorative botanical SVG */}
      <svg
        className="absolute top-0 right-0 w-40 sm:w-56 lg:w-72 h-auto text-[#D9BC9E]/40 pointer-events-none"
        viewBox="0 0 200 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M180 10C160 60 140 80 120 110C100 140 90 170 100 200C110 230 130 250 160 260"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M180 10C170 50 150 60 130 70C110 80 100 90 105 110"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M180 10C175 40 165 55 155 65C145 75 135 80 130 95"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        {/* Small leaves */}
        <ellipse cx="120" cy="108" rx="8" ry="14" transform="rotate(-30 120 108)" fill="currentColor" opacity="0.15" />
        <ellipse cx="138" cy="78" rx="6" ry="11" transform="rotate(-45 138 78)" fill="currentColor" opacity="0.12" />
        <ellipse cx="152" cy="62" rx="5" ry="9" transform="rotate(-50 152 62)" fill="currentColor" opacity="0.1" />
      </svg>

      {/* Bottom-left decorative heart + vine */}
      <svg
        className="absolute bottom-8 left-4 sm:left-10 w-24 sm:w-36 h-auto text-[#C26B59]/20 pointer-events-none"
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M60 130C60 130 30 100 20 70C10 40 30 10 60 30C90 10 110 40 100 70C90 100 60 130 60 130Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M60 130C55 115 50 95 50 80"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>

      {/* Small scattered hearts */}
      <svg
        className="absolute top-16 left-[15%] w-4 h-4 text-[#C26B59]/25 pointer-events-none animate-pulse"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Label ── */}
        <div className="flex items-center justify-center gap-4 mb-10 sm:mb-14">
          <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#C26B59]/40" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[#91885D]">
            Founder&apos;s Note
          </span>
          <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#C26B59]/40" />
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          {/* ── LEFT: Founder Photo (Polaroid-style) ── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Polaroid frame */}
              <div
                className="relative bg-white p-3 sm:p-4 pb-14 sm:pb-16 rounded-sm shadow-[0_8px_40px_rgba(41,37,31,0.12),0_2px_8px_rgba(41,37,31,0.08)]"
                style={{ transform: "rotate(-2deg)" }}
              >
                <div className="relative w-[260px] sm:w-[300px] aspect-[3/4] overflow-hidden rounded-[1px]">
                  <Image
                    src="/founder-photo.jpg"
                    alt="Vasvi — Founder of The Indulgent Spoon, decorating a cake in her bakery kitchen"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 260px, 300px"
                    quality={90}
                  />
                </div>

                {/* Handwritten caption at the bottom of polaroid */}
                <p
                  className="absolute bottom-4 sm:bottom-5 left-0 right-0 text-center font-[var(--font-caveat)] text-lg sm:text-xl text-[#5a4a3a]"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Good Food, Happier People ♡
                </p>
              </div>

              {/* Decorative tape on top-right corner */}
              <div
                className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-16 h-6 sm:w-20 sm:h-7 bg-[#E8D5BC]/80 rounded-sm shadow-sm pointer-events-none"
                style={{ transform: "rotate(25deg)" }}
              />

              {/* Sticky note badge — "Baked with Love Always" */}
              <div
                className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-10 bg-[#faf3e6] px-4 py-3 sm:px-5 sm:py-4 rounded-sm shadow-[0_4px_16px_rgba(41,37,31,0.1)] border border-[#E8D5BC]/60"
                style={{ transform: "rotate(-6deg)" }}
              >
                <p
                  className="text-sm sm:text-base text-[#5a4a3a] leading-snug"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Baked with Love<br />
                  <span className="text-base sm:text-lg">Always</span> <span className="text-[#C26B59]">♡</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Note Content ── */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-center lg:text-left">
            {/* Heading */}
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] text-[#29251F] tracking-tight">
              A Little More<br className="hidden sm:block" />{" "}
              Than Just Desserts
            </h2>

            {/* Body text */}
            <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-[#29251F]/80 max-w-lg mx-auto lg:mx-0">
              <p>
                The Indulgent Spoon started with a simple idea — to make everyday
                moments a little sweeter. What began as late-night baking experiments
                slowly turned into a passion for creating bakes that bring comfort,
                joy, and people closer.
              </p>
              <p className="text-[#696053]">
                Thank you for being a part of this journey.
              </p>
            </div>

            {/* Signature */}
            <div className="pt-2">
              <p
                className="text-3xl sm:text-4xl text-[#3d3225] inline-flex items-center gap-2"
                style={{ fontFamily: "var(--font-caveat)" }}
              >
                Vasvi
                <span className="text-[#C26B59] text-2xl">♡</span>
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#91885D] mt-1">
                Founder, The Indulgent Spoon
              </p>
            </div>

            {/* Decorative rotated badge — "Same Ingredients, More Happiness" */}
            <div className="hidden lg:block absolute top-8 right-8 xl:right-12">
              <div
                className="bg-[#E8D5BC]/50 border border-[#D9BC9E]/60 rounded-full w-36 h-36 xl:w-40 xl:h-40 flex items-center justify-center shadow-sm"
                style={{ transform: "rotate(12deg)" }}
              >
                <p
                  className="text-center text-[#5a4a3a] text-sm xl:text-base leading-snug px-4"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  Same<br />
                  Ingredients,<br />
                  More<br />
                  Happiness <span className="text-[#C26B59]">♡</span>
                </p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}
