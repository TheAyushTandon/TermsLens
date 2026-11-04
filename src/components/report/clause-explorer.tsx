"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileText,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clause, AttentionLevel, VerificationStatus } from "@/types";

interface ClauseExplorerProps {
  clauses: Clause[];
  selectedClauseId?: string;
  onSelectClause?: (clauseId: string) => void;
}

export function ClauseExplorer({
  clauses,
  selectedClauseId,
  onSelectClause,
}: ClauseExplorerProps) {
  const currentIndex = React.useMemo(() => {
    if (!selectedClauseId || clauses.length === 0) return 0;
    const idx = clauses.findIndex((c) => c.id === selectedClauseId);
    return idx >= 0 ? idx : 0;
  }, [clauses, selectedClauseId]);

  const activeClause = clauses[currentIndex] || null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevClause = clauses[currentIndex - 1];
      onSelectClause?.(prevClause.id);
    }
  };

  const handleNext = () => {
    if (currentIndex < clauses.length - 1) {
      const nextClause = clauses[currentIndex + 1];
      onSelectClause?.(nextClause.id);
    }
  };

  const formatAttentionBadge = (level: AttentionLevel) => {
    switch (level) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            High Attention
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Moderate Attention
          </span>
        );
      case "informational":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Informational
          </span>
        );
    }
  };

  const formatVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "supported":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Demo Verified — Supported
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Demo Verified — Partially Supported
          </span>
        );
      case "unverified":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <HelpCircle className="h-3.5 w-3.5" />
            Not Verified
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400">
            <XCircle className="h-3.5 w-3.5" />
            Rejected in Demo Review
          </span>
        );
    }
  };

  if (!activeClause) {
    return (
      <Card className="border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500">No clauses available in this report.</p>
      </Card>
    );
  }

  // Highlight original clause excerpt if defined
  const renderOriginalTextWithHighlight = () => {
    const full = activeClause.originalClauseText;
    const excerpt = activeClause.evidence.highlightExcerpt;

    if (!excerpt || !full.includes(excerpt)) {
      return (
        <p className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
          {full}
        </p>
      );
    }

    const parts = full.split(excerpt);
    return (
      <p className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
        {parts[0]}
        <mark className="rounded-md bg-amber-100/90 px-1 py-0.5 text-amber-950 font-semibold dark:bg-amber-950/80 dark:text-amber-200 border-b-2 border-amber-400 dark:border-amber-600">
          {excerpt}
        </mark>
        {parts.slice(1).join(excerpt)}
      </p>
    );
  };

  return (
    <div className="space-y-4" id="clause-explorer">
      {/* Clause Selector & Navigation Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Clause {currentIndex + 1} of {clauses.length}
              </span>
              <span>•</span>
              {formatAttentionBadge(activeClause.attentionLevel)}
            </div>
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activeClause.title}
            </h3>
          </div>
        </div>

        {/* Previous / Next Controls and Quick Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            id="clause-quick-select"
            name="clauseQuickSelect"
            aria-label="Jump to clause"
            value={activeClause.id}
            onChange={(e) => onSelectClause?.(e.target.value)}
            className="h-8 max-w-[200px] truncate rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none"
          >
            {clauses.map((c, idx) => (
              <option key={c.id} value={c.id}>
                {idx + 1}. {c.title}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="xs"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous clause"
            leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleNext}
            disabled={currentIndex === clauses.length - 1}
            aria-label="Next clause"
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Two-Column Explorer Layout (Desktop: 2 columns, Mobile: stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* LEFT PANEL: ORIGINAL DOCUMENT */}
        <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs h-full">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Left Panel • Source Evidence
                </span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Exact Original Clause Text</span>
                </h4>
              </div>

              {/* Source Reference Label */}
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {activeClause.evidence.sourceReferenceText || "Reference unavailable"}
                </span>
              </div>
            </div>

            {/* Section Heading Metadata */}
            <div className="rounded-lg bg-slate-50/80 p-3 text-xs dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Document Section Reference
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {activeClause.evidence.sectionHeading || "Reference unavailable"}
              </p>
              {activeClause.evidence.sourcePage ? (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Original Source Location: Page {activeClause.evidence.sourcePage}
                </p>
              ) : null}
            </div>

            {/* Verbatim Original Agreement with Highlight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Verbatim Passage
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Highlighted passage represents key operative term
                </span>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950 max-h-[380px] overflow-y-auto">
                {renderOriginalTextWithHighlight()}
              </div>
            </div>

            {/* Verbatim quote inspection snippet */}
            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <strong className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                Exact Quote Cited:
              </strong>
              &ldquo;{activeClause.evidence.exactQuote}&rdquo;
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL: AI ANALYSIS */}
        <Card className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs h-full">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Right Panel • Plain-English Translation
                </span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>AI Clause Analysis</span>
                </h4>
              </div>

              {/* Verification Status */}
              <div>{formatVerificationBadge(activeClause.verification.status)}</div>
            </div>

            {/* Plain-Language Explanation */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Plain-Language Explanation
              </span>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs sm:text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-200 leading-relaxed">
                {activeClause.analysis.plainLanguageExplanation}
              </div>
            </div>

            {/* Why This Clause Matters */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Why this clause matters
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeClause.analysis.whyThisClauseMatters}
              </p>
            </div>

            {/* Potential User Implications */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Potential User Implications
              </span>
              <ul className="space-y-2 rounded-xl bg-slate-50/60 p-3.5 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800">
                {activeClause.analysis.potentialUserImplications.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Advice / Recommendation */}
            {activeClause.analysis.actionableAdvice && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase tracking-wide text-[10px] mr-1">
                    What you can do:
                  </span>
                  {activeClause.analysis.actionableAdvice}
                </div>
              </div>
            )}

            {/* Audit notes and evidence verification */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Verified against raw text via semantic parser</span>
              <span>Audit timestamp: {new Date(activeClause.verification.verifiedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

