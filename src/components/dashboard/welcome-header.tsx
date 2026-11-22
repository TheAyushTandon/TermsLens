"use client";

import * as React from "react";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeHeaderProps {
  onUploadClick: () => void;
  isEmptyState?: boolean;
  onToggleEmptyState?: () => void;
}

export function WelcomeHeader({
  onUploadClick,
}: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between border-b border-[#d7d9ce]">
      <div className="space-y-1.5 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[#040404] sm:text-3xl">
          Understand what you&apos;re agreeing to.
        </h1>
        <p className="text-xs sm:text-sm text-[#4a5759] leading-relaxed">
          Never blindly click &ldquo;I Agree&rdquo; again. Paste or upload any terms of service or privacy policy to get a crystal-clear breakdown in plain English.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          onClick={onUploadClick}
          size="sm"
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="shadow-xs text-xs font-semibold bg-[#119da4] hover:bg-[#0c7489] text-white"
        >
          Scan a Policy
        </Button>
      </div>
    </div>
  );
}
