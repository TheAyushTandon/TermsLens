"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  Eye,
  Quote,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProductExperience() {
  const features = [
    {
      icon: FileText,
      title: "Simplifies complicated legal language",
      description:
        "Transforms dense paragraphs and confusing legalese into clear, plain-English summaries you can actually understand.",
    },
    {
      icon: AlertTriangle,
      title: "Identifies clauses that deserve attention",
      description:
        "Highlights key terms such as mandatory arbitration, class action waivers, and automatic subscription renewals before you agree.",
    },
    {
      icon: Eye,
      title: "Explains privacy & data collection",
      description:
        "Breaks down what personal data is gathered, whether it is sold to advertisers, and how your information is retained.",
    },
    {
      icon: Quote,
      title: "Shows original text supporting each finding",
      description:
        "Every AI insight cites the exact sentence and section directly from the original agreement so you can verify it yourself.",
    },
  ];

  return (
    <section aria-label="How TermsLens Works" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            How TermsLens Helps You
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Designed for everyday users who want clarity, transparency, and control.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card
              key={idx}
              className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs"
            >
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subtle Responsible AI Disclaimer */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <Info className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <p className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-slate-700 dark:text-slate-300">
            Responsible AI Disclaimer:
          </strong>{" "}
          TermsLens provides informational analysis, not legal advice. Always refer to the original document for final decisions.
        </p>
      </div>
    </section>
  );
}

