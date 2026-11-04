"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Calendar,
  AlertTriangle,
  Scale,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalysisReport, DocumentType } from "@/types";

interface ReportHeaderProps {
  report: AnalysisReport;
  onExportClick: () => void;
  onBackClick?: () => void;
}

export function ReportHeader({
  report,
  onExportClick,
  onBackClick,
}: ReportHeaderProps) {
  const formatDocType = (type: DocumentType) => {
    switch (type) {
      case "terms_of_service":
        return "Terms of Service";
      case "privacy_policy":
        return "Privacy Policy";
      case "eula":
        return "End User Licence Agreement";
      case "subscription_agreement":
        return "Subscription Agreement";
      case "other":
        return "Agreement";
      default:
        return type;
    }
  };

  const formattedDate = new Date(report.analysisDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
      {/* Top back navigation and primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/#reports"
          onClick={onBackClick}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Recent Analyses</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportClick}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            className="text-xs font-medium"
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Title, Badge and Metadata Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" size="sm" className="font-semibold text-slate-700 dark:text-slate-300">
              {formatDocType(report.documentType)}
            </Badge>

            {report.isDemonstrationFixture && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Sample Demonstration
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {report.appName}
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-2 text-xl sm:text-2xl">
              — {report.documentTitle}
            </span>
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Analyzed on {formattedDate}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>TermsLens Policy Breakdown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demonstration Data Disclaimer Banner when applicable */}
      {report.isDemonstrationFixture && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p>
            <strong className="font-semibold uppercase tracking-wide mr-1.5">
              Demonstration Notice:
            </strong>
            {report.demonstrationNotice ||
              `This is illustrative demonstration content, not the actual official policy of ${report.appName}.`}
          </p>
        </div>
      )}
    </div>
  );
}

