import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  indicatorColor?: "default" | "high" | "medium" | "safe" | "dynamic";
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorColor = "dynamic",
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Dynamic color determination based on risk score (higher score = more risk)
  let barColor = "bg-slate-900 dark:bg-slate-100";
  if (indicatorColor === "high" || (indicatorColor === "dynamic" && percentage >= 70)) {
    barColor = "bg-rose-500";
  } else if (indicatorColor === "medium" || (indicatorColor === "dynamic" && percentage >= 40)) {
    barColor = "bg-amber-500";
  } else if (indicatorColor === "safe" || (indicatorColor === "dynamic" && percentage < 40)) {
    barColor = "bg-emerald-500";
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 transition-all duration-300 ease-out", barColor)}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

