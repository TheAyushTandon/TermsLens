"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Info,
  ArrowRight,
} from "lucide-react";
import { DocumentAnalysis } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AnalysisDetailModalProps {
  document: DocumentAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisDetailModal({
  document,
  isOpen,
  onClose,
}: AnalysisDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!document) return null;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(
      `TermsLens Breakdown for ${document.appName} - ${document.title}:\n\n${document.summary}\n\nFlagged Clauses (${document.flaggedClausesCount}):\n` +
        document.findings
          .map((f) => `• ${f.title}: ${f.explanation}`)
          .join("\n")
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${document.appName} - ${document.title}`}
      description={
        document.isDemonstrationFixture
          ? `Sample Demonstration Record • Analyzed on ${new Date(document.createdAt).toLocaleDateString()}`
          : `Analyzed on ${new Date(document.createdAt).toLocaleDateString()}`
      }
      maxWidth="3xl"
    >
      <div className="space-y-6 text-xs sm:text-sm">
        {/* Demonstrative Fixture Disclaimer Banner */}
        {document.isDemonstrationFixture && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[11px] mr-1.5">
                Demonstration Fixture:
              </span>
              This is illustrative demonstration content, not the actual official policy of {document.appName}.
            </div>
          </div>
        )}

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Clauses Flagged
            </span>
            <div className="flex items-center gap-2">
              {document.flaggedClausesCount > 0 ? (
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{document.flaggedClausesCount} clauses to review</span>
                </div>
              ) : (
                <div className="text-emerald-700 font-semibold text-sm">
                  0 red flags found
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {document.clausesCount} total sections scanned
            </p>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Reading Time Saved
            </span>
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
              <Clock className="h-4 w-4 text-[#119da4]" />
              <span>{document.timeSavedMinutes} minutes saved</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Est. original length: ~{document.estimatedReadingTimeMinutes} mins
            </p>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Privacy-Related Findings
            </span>
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] text-rose-800 font-medium">
                {document.privacyFindingsCount} tracking disclosures
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Location, device tags, or ad partners
            </p>
          </div>
        </div>

        {/* Executive Summary Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#13505b]">
              Simple Summary
            </h4>
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 text-xs text-[#119da4] hover:text-[#0c7489] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy summary</span>
                </>
              )}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
            {document.summary}
          </div>
        </div>

        {/* Extracted Findings with Exact Legal Excerpts vs Plain English */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Clauses Identified ({document.findings.length})
          </h4>

          <div className="space-y-3">
            {document.findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {finding.title}
                  </span>
                  <Badge variant={finding.riskLevel} size="sm">
                    {finding.riskLevel === "high"
                      ? "Important"
                      : finding.riskLevel === "medium"
                      ? "Attention"
                      : "Standard"}
                  </Badge>
                </div>

                {/* Excerpt */}
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200/60">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Original Agreement Excerpt:
                  </span>
                  &ldquo;{finding.excerpt}&rdquo;
                </div>

                {/* Plain English Translation & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      What this means for you
                    </span>
                    <p className="text-xs text-slate-700 leading-normal">
                      {finding.explanation}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-emerald-500" />
                      What you can do
                    </span>
                    <p className="text-xs text-slate-700 leading-normal">
                      {finding.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible AI Disclaimer in modal */}
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200/80">
          <Info className="h-4 w-4 flex-shrink-0 text-slate-400 mt-0.5" />
          <span>
            TermsLens provides informational analysis, not legal advice. Always refer to the original document for final decisions.
          </span>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>

          <Link href={`/reports/${document.id}`}>
            <Button
              size="sm"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              className="text-xs font-semibold"
            >
              Open Full Analysis Report
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
