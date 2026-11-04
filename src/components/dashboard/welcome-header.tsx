"use client";

import * as React from "react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeHeaderProps {
  onUploadClick: () => void;
  isEmptyState: boolean;
  onToggleEmptyState: () => void;
}

export function WelcomeHeader({
  onUploadClick,
  isEmptyState,
  onToggleEmptyState,
}: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="space-y-1.5 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Understand what you&apos;re agreeing to.
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Complex terms shouldn&apos;t be difficult to understand. Upload a policy and let AI break it down into simple explanations, important clauses and potential red flags.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Toggle between real mock data and honest empty state for reviewer testing */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleEmptyState}
          className="text-xs text-slate-600 dark:text-slate-300"
          title="Toggle between sample data and fresh empty state"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
          {isEmptyState ? "Load Sample Analyses" : "Show Empty State"}
        </Button>

        <Button
          onClick={onUploadClick}
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-xs text-xs font-semibold"
        >
          Upload Policy
        </Button>
      </div>
    </div>
  );
}
