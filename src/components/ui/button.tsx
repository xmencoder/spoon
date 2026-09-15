import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C26B59] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] shadow-warm-sm hover:shadow-warm-md active:scale-[0.98] border border-transparent",
        cta:
          "rounded-xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] shadow-warm-md hover:shadow-warm-lg hover:-translate-y-0.5 tracking-wide border border-transparent",
        secondary:
          "rounded-xl bg-[#E8D5BC] text-[#29251F] hover:bg-[#91885D]/25 border border-[#91885D]/30 transition-colors",
        outline:
          "rounded-xl border border-[#91885D]/40 bg-[#F5EBDD] text-[#29251F] hover:bg-[#E8D5BC] hover:border-[#91885D]/60 transition-all",
        pill:
          "rounded-full border border-[#91885D]/30 bg-[#F5EBDD] text-[#29251F] hover:bg-[#C26B59] hover:text-[#F5EBDD] hover:border-[#C26B59] transition-all",
        add:
          "rounded-lg bg-[#F5EBDD] hover:bg-[#C26B59] text-[#29251F] hover:text-[#F5EBDD] border border-[#91885D]/40 hover:border-transparent transition-all shadow-2xs",
        ghost:
          "rounded-xl text-[#29251F] hover:bg-[#E8D5BC]/70 hover:text-[#29251F] transition-colors",
        link:
          "text-[#C26B59] hover:text-[#A95145] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-13 px-8 text-base font-semibold",
        icon: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
