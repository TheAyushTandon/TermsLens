"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisReport } from "@/types";

interface DocumentOverviewBarProps {
  report: AnalysisReport;
}

export function DocumentOverviewBar({ report }: DocumentOverviewBarProps) {
  const metricCards = [
    {
      label: "Total Clauses Scanned",
      value: report.totalClausesAnalyzed,
      subtext: "Sections checked in document",
      icon: FileText,
      iconBg: "bg-[#eef1ec] text-[#13505b]",
    },
    {
      label: "Things to Watch Out For",
      value: report.highAttentionCount,
      subtext: "Arbitration or rights waivers",
      icon: ShieldAlert,
      iconBg: "bg-rose-50 text-[#c93b2b]",
    },
    {
      label: "Notice Items",
      value: report.moderateAttentionCount,
      subtext: "Auto-renewals or unilateral changes",
      icon: AlertTriangle,
      iconBg: "bg-amber-50 text-amber-700",
    },
    {
      label: "Standard Terms",
      value: report.informationalCount,
      subtext: "Routine operating rules",
      icon: Info,
      iconBg: "bg-[#e5ebe9] text-[#0c7489]",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Document Summary Card */}
      <Card className="border-[#d7d9ce] bg-white shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#13505b]">
            <FileText className="h-4 w-4 text-[#119da4]" />
            <span>The Quick Summary</span>
          </div>
          <p className="text-sm text-[#040404] leading-relaxed">
            {report.documentSummary}
          </p>
        </CardContent>
      </Card>

      {/* Metrics Counters Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card
              key={idx}
              className="border-[#d7d9ce] bg-white transition-all duration-150 hover:border-[#119da4] shadow-xs"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#4a5759]">
                    {metric.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-[#040404]">
                    {metric.value}
                  </div>
                  <p className="mt-1 text-[11px] text-[#4a5759]">
                    {metric.subtext}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
