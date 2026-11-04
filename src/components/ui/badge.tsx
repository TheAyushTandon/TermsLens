import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { RiskLevel } from "@/types";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
        secondary:
          "border border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        outline:
          "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        high: "border border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400",
        medium:
          "border border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400",
        low: "border border-sky-200 bg-sky-50/90 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-400",
        safe: "border border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400",
        neutral:
          "border border-slate-200 bg-slate-100/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] leading-tight",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "high" && "bg-rose-500",
            variant === "medium" && "bg-amber-500",
            variant === "low" && "bg-sky-500",
            variant === "safe" && "bg-emerald-500",
            (!variant || variant === "default" || variant === "neutral" || variant === "secondary") &&
              "bg-slate-400"
          )}
        />
      )}
      {children}
    </div>
  );
}

export function RiskBadge({
  riskLevel,
  score,
  className,
}: {
  riskLevel: RiskLevel;
  score?: number;
  className?: string;
}) {
  const labels: Record<RiskLevel, string> = {
    high: "High Risk",
    medium: "Caution",
    low: "Low Risk",
    safe: "Fair Terms",
  };

  return (
    <Badge variant={riskLevel} dot className={className}>
      <span>{labels[riskLevel]}</span>
      {typeof score === "number" && (
        <span className="font-mono text-[10px] opacity-75 font-semibold">
          ({score}/100)
        </span>
      )}
    </Badge>
  );
}

