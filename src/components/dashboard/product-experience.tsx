"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  Eye,
  Quote,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProductExperience() {
  const features = [
    {
      icon: FileText,
      title: "Plain English, No Jargon",
      description:
        "Transforms dense paragraphs and confusing legalese into clear, simple summaries you can read in two minutes.",
    },
    {
      icon: AlertTriangle,
      title: "Spots Hidden Traps",
      description:
        "Flags tricky terms like binding arbitration, automatic monthly renewals, and rights you give up before agreeing.",
    },
    {
      icon: Eye,
      title: "Explains How Your Data Is Used",
      description:
        "Shows exactly what personal info is tracked, whether it gets sold to advertisers, and if you can delete it.",
    },
    {
      icon: Quote,
      title: "Word-for-Word Proof",
      description:
        "Every single insight cites the exact sentence and section directly from the original agreement so you can verify it yourself.",
    },
  ];

  return (
    <section aria-label="How TermsLens Works" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-[#040404]">
          How TermsLens Protects You
        </h2>
        <p className="text-xs text-[#4a5759] mt-0.5">
          Designed for everyday people who want clarity, transparency, and control over what they sign.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card
              key={idx}
              className="border-[#d7d9ce] bg-white transition-all duration-200 hover:border-[#119da4] shadow-xs"
            >
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef1ec] text-[#119da4]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#040404] leading-snug">
                  {feature.title}
                </h3>
                <p className="text-[11px] text-[#4a5759] leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subtle Responsible AI Disclaimer */}
      <div className="flex items-center gap-2 rounded-xl border border-[#d7d9ce] bg-[#f7f8f5] px-4 py-3 text-xs text-[#4a5759]">
        <Info className="h-4 w-4 shrink-0 text-[#119da4]" />
        <p className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-[#13505b]">
            Responsible AI Notice:
          </strong>{" "}
          TermsLens provides informational analysis, not formal legal advice. Always refer to the original document for official terms.
        </p>
      </div>
    </section>
  );
}
