"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        success: "bg-green-50 text-green-700",
        warning: "bg-amber-50 text-amber-700",
        error: "bg-red-50 text-red-700",
        info: "bg-blue-50 text-blue-700",
        purple: "bg-purple-50 text-purple-700",
        outline: "border border-gray-200 text-gray-600",
        secondary: "bg-gray-100 text-gray-600 border border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", {
            "bg-gray-400": !variant || variant === "outline" || variant === "default",
            "bg-green-500": variant === "success",
            "bg-amber-500": variant === "warning",
            "bg-red-500": variant === "error",
            "bg-blue-500": variant === "info",
            "bg-purple-500": variant === "purple",
          })}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };