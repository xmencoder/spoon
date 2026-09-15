"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Utensils,
  Clock,
} from "lucide-react";

export default function OrderSuccessPage() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans flex flex-col text-[#29251F]">
      {/* Top accent bar */}
      <div className="h-1 bg-[#91885D]" />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {/* Success icon */}
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F5EBDD] border-4 border-[#91885D]/30 shadow-warm-sm">
            <CheckCircle2 className="h-12 w-12 text-[#91885D]" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#C26B59] border-2 border-[#F5EBDD]">
            <MessageCircle className="h-4 w-4 text-[#F5EBDD]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#29251F] mb-2">
          Order Request Sent!
        </h1>
        <p className="text-sm text-[#29251F]/80 max-w-xs leading-relaxed">
          Your order has been recorded and your WhatsApp message is ready to send to{" "}
          <span className="font-semibold text-[#29251F]">The Indulgent Spoon</span>.
        </p>

        {/* Important notice */}
        <div className="mt-6 max-w-sm rounded-2xl border border-[#91885D]/30 bg-[#F5EBDD] p-4 text-left space-y-2 shadow-warm-xs">
          <p className="text-xs font-bold text-[#C26B59] flex items-center gap-1.5 uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" />
            Please wait for confirmation
          </p>
          <p className="text-xs text-[#29251F]/85 leading-relaxed">
            Your order is <strong>not yet confirmed</strong>. Please send the
            WhatsApp message and wait for The Indulgent Spoon to confirm your
            order and provide an estimated time.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-6 max-w-sm w-full space-y-3 text-left">
          {[
            {
              step: "1",
              label: "WhatsApp opened",
              desc: "Your pre-filled order message is ready",
              done: true,
            },
            {
              step: "2",
              label: "Send the message",
              desc: "Tap Send in WhatsApp to notify the kitchen",
              done: false,
            },
            {
              step: "3",
              label: "Await confirmation",
              desc: "The kitchen will confirm your order shortly",
              done: false,
            },
          ].map(({ step, label, desc, done }) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black border-2 ${
                  done
                    ? "bg-[#91885D] border-[#91885D] text-[#F5EBDD]"
                    : "bg-[#F5EBDD] border-[#91885D]/30 text-[#696053]"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step}
              </div>
              <div>
                <p className="text-xs font-bold text-[#29251F]">{label}</p>
                <p className="text-[11px] text-[#696053]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
          <Link
            href={`/store/${slug}`}
            className="flex items-center justify-between rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-5 py-4 text-sm font-bold shadow-warm-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span>Order More Items</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>

          <Link
            href={`/store/${slug}`}
            className="flex items-center justify-center rounded-2xl border border-[#91885D]/35 bg-[#F5EBDD] text-[#29251F] px-5 py-3.5 text-sm font-semibold hover:bg-[#E8D5BC] transition-colors"
          >
            Back to Menu
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-[10px] text-[#696053] max-w-xs">
          Having trouble? Contact The Indulgent Spoon directly via WhatsApp or
          phone to confirm your order manually.
        </p>
      </main>
    </div>
  );
}
