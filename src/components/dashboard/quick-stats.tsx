"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  EyeOff,
  Clock,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { ConsumerStats } from "@/types";

interface QuickStatsProps {
  stats: ConsumerStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const isZero = stats.documentsAnalyzed === 0;

  const statCards = [
    {
      title: "Documents Analyzed",
      value: stats.documentsAnalyzed.toString(),
      subtext: isZero ? "Upload a document to begin" : "Demonstration records loaded",
      icon: FileText,
      tooltip: "The number of policies currently loaded in the repository.",
      accent: "slate",
    },
    {
      title: "Clauses Requiring Attention",
      value: stats.clausesRequiringAttention.toString(),
      subtext: isZero ? "No clauses flagged yet" : "Clauses to review before agreeing",
      icon: AlertTriangle,
      tooltip: "Clauses such as arbitration waivers, auto-renewals, or liability exclusions.",
      accent: "amber",
    },
    {
      title: "Privacy-Related Findings",
      value: stats.privacyRelatedFindings.toString(),
      subtext: isZero ? "No tracking data recorded" : "Tracking & third-party sharing",
      icon: EyeOff,
      tooltip: "Practices involving location tracking, advertising profile sharing, or voice data collection.",
      accent: "rose",
    },
    {
      title: "Reading Time Saved",
      value: isZero
        ? "0 mins"
        : stats.readingTimeSavedMinutes >= 60
        ? `${(stats.readingTimeSavedMinutes / 60).toFixed(1)} hrs`
        : `${stats.readingTimeSavedMinutes} mins`,
      subtext: isZero ? "Based on average reading speed" : "Estimated time saved using AI summaries",
      icon: Clock,
      tooltip: "Calculated based on standard 200 words-per-minute average reading speed.",
      accent: "blue",
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Header bar with DEMO DATA indicator when metrics are calculated from sample records */}
      {stats.isDemoData && !isZero && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Summary Metrics
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            DEMO DATA
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              className="group relative overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>{card.title}</span>
                    <Tooltip content={card.tooltip}>
                      <Info className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" />
                    </Tooltip>
                  </div>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      card.accent === "rose"
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                        : card.accent === "amber"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                        : card.accent === "blue"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                    {card.value}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate">
                    {card.subtext}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
