"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  EyeOff,
  Clock,
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
      title: "Policies Checked",
      value: stats.documentsAnalyzed.toString(),
      subtext: isZero ? "Paste or upload to start" : "Agreements in your repository",
      icon: FileText,
      tooltip: "The total number of legal agreements analyzed.",
      iconBg: "bg-[#eef1ec] text-[#13505b]",
    },
    {
      title: "Clauses to Watch Out For",
      value: stats.clausesRequiringAttention.toString(),
      subtext: isZero ? "No high-risk terms found" : "Arbitration, auto-renewals, waivers",
      icon: AlertTriangle,
      tooltip: "Clauses like binding arbitration, class-action waivers, or auto-renewals.",
      iconBg: "bg-amber-50 text-amber-700",
    },
    {
      title: "Data Tracking Practices",
      value: stats.privacyRelatedFindings.toString(),
      subtext: isZero ? "No tracking data logged" : "Location, device ID, ad targeting",
      icon: EyeOff,
      tooltip: "How companies gather, share, or sell your personal data.",
      iconBg: "bg-rose-50 text-[#c93b2b]",
    },
    {
      title: "Reading Time Saved",
      value: isZero
        ? "0 mins"
        : stats.readingTimeSavedMinutes >= 60
        ? `${(stats.readingTimeSavedMinutes / 60).toFixed(1)} hrs`
        : `${stats.readingTimeSavedMinutes} mins`,
      subtext: isZero ? "Based on average reading speed" : "Estimated reading time saved",
      icon: Clock,
      tooltip: "Time saved based on average reading speed of 200 words per minute.",
      iconBg: "bg-[#e5ebe9] text-[#0c7489]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className="border-[#d7d9ce] bg-white transition-all duration-200 hover:border-[#119da4] hover:shadow-sm"
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#4a5759]">
                  {card.title}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-[#040404]">
                  {card.value}
                </div>
                <p className="mt-1 text-[11px] text-[#4a5759]">
                  {card.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
