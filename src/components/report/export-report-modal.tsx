"use client";

import * as React from "react";
import {
  Printer,
  Copy,
  Check,
  FileCode,
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
Things to Watch Out For: ${report.highAttentionCount}
Notice Items: ${report.moderateAttentionCount}
Standard Terms: ${report.informationalCount}

## Document Summary
${report.documentSummary}

## The Big Picture (Executive Summary)
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
Exported from TermsLens — Clear Policy Explainer for Consumers
`;
  };

  const handleCopyMarkdown = async () => {
    try {
      const text = generateMarkdown();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy markdown:", err);
    }
  };

  const handleDownloadJson = () => {
    try {
      const jsonStr = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `termslens-${report.appName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-report.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download JSON:", err);
    }
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
      <div className="space-y-4 text-xs">
        <p className="text-xs text-[#4a5759]">
          Select an export format below to share or archive this document breakdown:
        </p>

        <div className="space-y-2.5">
          {/* Option 1: Print / PDF */}
          <div
            onClick={handlePrint}
            className="flex items-center justify-between rounded-xl border border-[#d7d9ce] p-3.5 hover:border-[#119da4] hover:bg-[#f7f8f5] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef1ec] text-[#13505b]">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-[#040404] text-xs">
                  Print or Save as PDF
                </h4>
                <p className="text-[11px] text-[#4a5759]">
                  Formatted printer-friendly document sheet
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline" className="border-[#d7d9ce]">
              Print
            </Button>
          </div>

          {/* Option 2: Copy Markdown */}
          <div
            onClick={handleCopyMarkdown}
            className="flex items-center justify-between rounded-xl border border-[#d7d9ce] p-3.5 hover:border-[#119da4] hover:bg-[#f7f8f5] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef1ec] text-[#13505b]">
                {copied ? (
                  <Check className="h-4 w-4 text-[#119da4]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-[#040404] text-xs">
                  Copy Markdown Summary
                </h4>
                <p className="text-[11px] text-[#4a5759]">
                  Formatted for Notion, Obsidian, GitHub, or email
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline" className="border-[#d7d9ce]">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Option 3: Download JSON */}
          <div
            onClick={handleDownloadJson}
            className="flex items-center justify-between rounded-xl border border-[#d7d9ce] p-3.5 hover:border-[#119da4] hover:bg-[#f7f8f5] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef1ec] text-[#13505b]">
                <FileCode className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-[#040404] text-xs">
                  Download Structured JSON
                </h4>
                <p className="text-[11px] text-[#4a5759]">
                  Full programmatic schema with verbatim evidence
                </p>
              </div>
            </div>
            <Button size="xs" variant="outline" className="border-[#d7d9ce]">
              Download
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[#eef1ec]">
          <Button size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
