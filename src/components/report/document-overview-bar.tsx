"use client";

import * as React from "react";
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { AnalysisReport } from "@/types";

interface DocumentOverviewBarProps {
  report: AnalysisReport;
}

export function DocumentOverviewBar({ report }: DocumentOverviewBarProps) {
  const metricCards = [
    {
      label: "Total Clauses Analyzed",
      value: report.totalClausesAnalyzed,
      subtext: "Sections scanned in document",
      icon: FileText,
      accent: "slate",
      tooltip: "Total individual legal sections processed by TermsLens parser.",
    },
    {
      label: "High-Attention Findings",
      value: report.highAttentionCount,
      subtext: "Binding waivers or broad grants",
      icon: ShieldAlert,
      accent: "rose",
      tooltip: "Clauses with significant impact on user rights, such as mandatory arbitration or broad data licensing.",
    },
    {
      label: "Moderate-Attention Findings",
      value: report.moderateAttentionCount,
      subtext: "Recurring billing or change terms",
      icon: AlertTriangle,
      accent: "amber",
      tooltip: "Clauses that require user awareness, such as auto-renewals or cancellation procedures.",
    },
    {
      label: "Informational Findings",
      value: report.informationalCount,
      subtext: "Standard operating provisions",
      icon: Info,
      accent: "blue",
      tooltip: "Routine consumer provisions such as age requirements or general service disclaimers.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Document Summary Card */}
      <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Document Overview & Summary</span>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
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
              className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>{metric.label}</span>
                    <Tooltip content={metric.tooltip}>
                      <HelpCircle className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" />
                    </Tooltip>
                  </div>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      metric.accent === "rose"
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                        : metric.accent === "amber"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                        : metric.accent === "blue"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-2.5 font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {metric.value}
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {metric.subtext}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mandatory Regulatory Assessment Principle Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            Responsible AI Notice:
          </strong>{" "}
          TermsLens organizes and clarifies contractual agreements for consumer awareness.
          Findings indicate relative attention levels; TermsLens never designates any document as legally safe or unsafe. Always consult official documentation for legal advice.
        </p>
      </div>
    </div>
  );
}

