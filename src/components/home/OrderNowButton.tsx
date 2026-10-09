"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface OrderNowButtonProps {
  className?: string;
}

export function OrderNowButton({ className }: OrderNowButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const menuEl = document.getElementById("menu");
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#menu");
    } else {
      window.location.href = "#menu";
    }
  };

  return (
    <a
      href="#menu"
      onClick={handleClick}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-full bg-[#C26B59] hover:bg-[#A95145] text-white px-9 py-4 text-sm font-bold shadow-[0_8px_32px_rgba(194,107,89,0.4)] hover:shadow-[0_12px_40px_rgba(194,107,89,0.5)] transition-all duration-300 cursor-pointer"
      }
    >
      <span>Order Now</span>
      <ArrowRight className="h-4 w-4" strokeWidth={2} />
    </a>
  );
}
