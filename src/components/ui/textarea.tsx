import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-2xl border border-[#91885D]/35 bg-[#F5EBDD] px-4 py-3 text-sm text-[#29251F] transition-all placeholder:text-[#696053]/70 focus-visible:border-[#C26B59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C26B59]/25 disabled:cursor-not-allowed disabled:opacity-50 resize-y leading-relaxed",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
