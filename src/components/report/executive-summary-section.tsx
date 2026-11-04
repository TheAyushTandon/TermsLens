"use client";

import * as React from "react";
import {
  FileText,
  UserCheck,
  Building,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ExecutiveSummary } from "@/types";

interface ExecutiveSummarySectionProps {
  summary: ExecutiveSummary;
  appName: string;
  isDemonstration?: boolean;
}

export function ExecutiveSummarySection({
  summary,
  appName,
  isDemonstration = false,
}: ExecutiveSummarySectionProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Executive Summary</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clear, plain-language translation of key terms, obligations, and rights.
          </p>
        </div>

        {isDemonstration && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Simulated Summary
          </span>
        )}
      </div>

      {/* 1. What this document is about */}
      <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>What this document is about</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {summary.documentOverview}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Main obligations imposed on the user */}
        <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Main obligations on you</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.mainObligations.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 3. Important permissions granted to the company */}
        <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Permissions granted to {appName}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.companyPermissions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4. Major areas requiring attention */}
        <Card className="border-amber-200/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Major areas requiring attention</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.majorAttentionAreas.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 5. What the user should review before agreeing */}
        <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Check before agreeing</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.preAgreementChecklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

