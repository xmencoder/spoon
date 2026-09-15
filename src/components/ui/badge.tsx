import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#C26B59] text-[#F5EBDD] shadow-xs",
        bestseller:
          "border-transparent bg-[#A95145] text-[#F5EBDD] shadow-xs font-bold",
        special:
          "border-transparent bg-[#91885D] text-[#F5EBDD] shadow-xs font-semibold",
        indulgent:
          "border-[#91885D]/40 bg-[#E8D5BC] text-[#29251F] border",
        fresh:
          "border-[#91885D]/35 bg-[#F5EBDD] text-[#29251F] border",
        chilled:
          "border-[#91885D]/35 bg-[#E8D5BC] text-[#29251F] border",
        secondary:
          "border-[#91885D]/25 bg-[#E8D5BC] text-[#29251F] border",
        outline:
          "border-[#91885D]/40 text-[#29251F] border bg-[#F5EBDD]",
        rose:
          "border-transparent bg-[#C26B59] text-[#F5EBDD]",
        olive:
          "border-transparent bg-[#91885D] text-[#F5EBDD]",
        success:
          "border-transparent bg-[#91885D]/30 text-[#29251F]",
        destructive:
          "border-transparent bg-[#A95145] text-[#F5EBDD]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
