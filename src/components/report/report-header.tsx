"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
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
    <div className="space-y-4 border-b border-[#d7d9ce] pb-5">
      {/* Top back navigation and primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/#reports"
          onClick={onBackClick}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#13505b] transition-colors hover:text-[#040404]"
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
            className="text-xs font-medium border-[#d7d9ce] hover:bg-[#eef1ec]"
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Title, Badge and Metadata Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" size="sm" className="font-semibold border-[#d7d9ce] bg-[#eef1ec] text-[#13505b]">
              {formatDocType(report.documentType)}
            </Badge>

            {report.isDemonstrationFixture && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Sample Agreement
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#040404] sm:text-3xl">
            {report.appName}
            <span className="text-[#4a5759] font-normal ml-2 text-xl sm:text-2xl">
              — {report.documentTitle}
            </span>
          </h1>

          <div className="flex items-center gap-2 text-xs text-[#4a5759]">
            <span>Analyzed on {formattedDate}</span>
            <span>•</span>
            <span className="text-[#119da4] font-medium">TermsLens Plain-English Breakdown</span>
          </div>
        </div>
      </div>
    </div>
  );
}
