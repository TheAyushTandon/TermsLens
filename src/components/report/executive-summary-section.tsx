"use client";

import * as React from "react";
import {
  FileText,
  UserCheck,
  Building,
  AlertTriangle,
  CheckCircle2,
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
          <h2 className="text-lg font-semibold tracking-tight text-[#040404] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#119da4]" />
            <span>The Big Picture (Executive Summary)</span>
          </h2>
          <p className="text-xs text-[#4a5759] mt-0.5">
            Clear, plain-language translation of key terms, obligations, and rights.
          </p>
        </div>

        {isDemonstration && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
            Sample Breakdown
          </span>
        )}
      </div>

      {/* 1. What this document is about */}
      <Card className="border-[#d7d9ce] bg-white shadow-xs">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#13505b] uppercase tracking-wider">
            <FileText className="h-4 w-4 text-[#119da4]" />
            <span>What this document is about</span>
          </div>
          <p className="text-xs sm:text-sm text-[#040404] leading-relaxed">
            {summary.documentOverview}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Main obligations on the user */}
        <Card className="border-[#d7d9ce] bg-white shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#13505b] uppercase tracking-wider">
              <UserCheck className="h-4 w-4 text-[#0c7489]" />
              <span>What you must do (Your Obligations)</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#040404]">
              {summary.mainObligations.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#119da4] mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 3. Important permissions granted to the company */}
        <Card className="border-[#d7d9ce] bg-white shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#13505b] uppercase tracking-wider">
              <Building className="h-4 w-4 text-[#119da4]" />
              <span>Permissions granted to {appName}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#040404]">
              {summary.companyPermissions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0c7489] mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4. Major areas requiring attention */}
        <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Red Flags & Things to Watch Out For</span>
            </div>
            <ul className="space-y-2.5 text-xs text-amber-950">
              {(summary.majorAttentionAreas || []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 5. Recommended actions before agreeing */}
        <Card className="border-[#d7d9ce] bg-white shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#13505b] uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-[#119da4]" />
              <span>Check Before You Agree</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#040404]">
              {(summary.preAgreementChecklist || []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#119da4] mt-1.5 shrink-0" />
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
