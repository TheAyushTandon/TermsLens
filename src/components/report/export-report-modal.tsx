"use client";

import * as React from "react";
import {
  Printer,
  Copy,
  Check,
  FileCode,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AnalysisReport } from "@/types";

interface ExportReportModalProps {
  report: AnalysisReport;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportReportModal({
  report,
  isOpen,
  onClose,
}: ExportReportModalProps) {
  const [copied, setCopied] = React.useState(false);

  const generateMarkdown = () => {
    return `# TermsLens Analysis Report: ${report.appName} — ${report.documentTitle}
Analyzed: ${new Date(report.analysisDate).toLocaleDateString()}
Total Clauses Scanned: ${report.totalClausesAnalyzed}
High Attention Findings: ${report.highAttentionCount}
Moderate Attention Findings: ${report.moderateAttentionCount}
Informational Findings: ${report.informationalCount}

## Document Summary
${report.documentSummary}

## Executive Summary
${report.executiveSummary.documentOverview}

### Main Obligations
${report.executiveSummary.mainObligations.map((o) => `- ${o}`).join("\n")}

### Permissions Granted
${report.executiveSummary.companyPermissions.map((p) => `- ${p}`).join("\n")}

### Major Areas Requiring Attention
${report.executiveSummary.majorAttentionAreas.map((a) => `- ${a}`).join("\n")}

## Important Clauses
${report.clauses
  .map(
    (c, i) => `### ${i + 1}. ${c.title} [${c.attentionLevel.toUpperCase()}]
Reference: ${c.evidence.sourceReferenceText || "Reference unavailable"}
Explanation: ${c.shortExplanation}
Original Quote: "${c.evidence.exactQuote}"
`
  )
  .join("\n")}

---
*Notice: TermsLens provides consumer policy explanations and informational summaries, not legal advice.*
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `${report.appName.toLowerCase().replace(/\s+/g, "_")}_termslens_report.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Analysis Report"
      description={`Export or share the ${report.appName} policy breakdown.`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs sm:text-sm">
        <p className="text-xs text-slate-500 leading-relaxed">
          Select an export format below to share or archive this document intelligence breakdown:
        </p>

        <div className="space-y-2.5">
          {/* Option 1: Print / Save as PDF */}
          <div
            onClick={handlePrint}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                  Print or Save as PDF
                </h4>
                <p className="text-[11px] text-slate-500">
                  Formatted printer-friendly document sheet
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline">
              Print
            </Button>
          </div>

          {/* Option 2: Copy Markdown */}
          <div
            onClick={handleCopyMarkdown}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                  Copy Markdown Summary
                </h4>
                <p className="text-[11px] text-slate-500">
                  Formatted for Notion, Obsidian, GitHub, or email
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Option 3: Download JSON */}
          <div
            onClick={handleDownloadJson}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <FileCode className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                  Download Structured JSON
                </h4>
                <p className="text-[11px] text-slate-500">
                  Full programmatic schema with verbatim evidence
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline">
              Download
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

