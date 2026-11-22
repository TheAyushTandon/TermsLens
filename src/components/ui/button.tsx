"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#119da4] text-white shadow-xs hover:bg-[#0c7489]",
        secondary:
          "bg-[#d7d9ce]/35 text-[#13505b] hover:bg-[#d7d9ce]/70",
        outline:
          "border border-[#d7d9ce] bg-white text-[#040404] shadow-xs hover:bg-[#d7d9ce]/20 hover:text-[#040404]",
        ghost:
          "text-[#13505b] hover:bg-[#d7d9ce]/25 hover:text-[#040404]",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700",
        link: "text-[#119da4] underline-offset-4 hover:underline p-0 h-auto font-normal",
        brand:
          "bg-[#119da4] text-white shadow-xs hover:bg-[#0c7489]",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-5 text-base rounded-xl",
        icon: "h-9 w-9 rounded-lg p-0",
        "icon-sm": "h-8 w-8 rounded-md p-0",
        "icon-xs": "h-7 w-7 rounded-md p-0",
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
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="mr-2 inline-flex items-center">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

