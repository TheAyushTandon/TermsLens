"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileText,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-[#c93b2b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c93b2b]" />
            Watch Out (High Risk)
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Notice (Worth Knowing)
          </span>
        );
      case "informational":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7d9ce] bg-[#eef1ec] px-2.5 py-0.5 text-xs font-semibold text-[#13505b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#119da4]" />
            Standard Term
          </span>
        );
    }
  };

  const formatVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "supported":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#119da4]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified Match — Quote Confirmed
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Partially Matched
          </span>
        );
      case "unverified":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4a5759]">
            <HelpCircle className="h-3.5 w-3.5" />
            Not Verified
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c93b2b]">
            <XCircle className="h-3.5 w-3.5" />
            Excluded
          </span>
        );
    }
  };

  if (!activeClause) {
    return (
      <Card className="border-[#d7d9ce] bg-white p-8 text-center">
        <p className="text-xs text-[#4a5759]">No clauses available in this report.</p>
      </Card>
    );
  }

  const renderOriginalTextWithHighlight = () => {
    const rawText = activeClause.originalClauseText;
    const quote = activeClause.evidence.exactQuote;

    if (!quote || !rawText.includes(quote)) {
      return (
        <p className="text-xs text-[#040404] leading-relaxed font-serif whitespace-pre-wrap">
          {rawText}
        </p>
      );
    }

    const index = rawText.indexOf(quote);
    const before = rawText.substring(0, index);
    const after = rawText.substring(index + quote.length);

    return (
      <p className="text-xs text-[#040404] leading-relaxed font-serif whitespace-pre-wrap">
        {before}
        <mark className="bg-[#e5ebe9] text-[#0c7489] px-1 py-0.5 rounded font-semibold border-b-2 border-[#119da4]">
          {quote}
        </mark>
        {after}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      {/* Clause Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#d7d9ce] bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#13505b] uppercase tracking-wider">
            Clause {currentIndex + 1} of {clauses.length}
          </span>
          <span className="text-[#d7d9ce]">•</span>
          {formatAttentionBadge(activeClause.attentionLevel)}
          <h3 className="text-sm font-semibold text-[#040404] ml-1">
            {activeClause.title}
          </h3>
        </div>

        {/* Clause Selector & Prev/Next */}
        <div className="flex items-center gap-2">
          <select
            aria-label="Jump to clause"
            value={activeClause.id}
            onChange={(e) => onSelectClause?.(e.target.value)}
            className="h-8 rounded-lg border border-[#d7d9ce] bg-white px-2.5 text-xs text-[#040404] focus:outline-none focus:ring-2 focus:ring-[#119da4]/20 max-w-[200px] truncate"
          >
            {clauses.map((c, i) => (
              <option key={c.id} value={c.id}>
                {i + 1}. {c.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous clause"
              className="border-[#d7d9ce]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={handleNext}
              disabled={currentIndex === clauses.length - 1}
              aria-label="Next clause"
              className="border-[#d7d9ce]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* LEFT PANEL: ORIGINAL CONTRACT TEXT */}
        <Card className="border-[#d7d9ce] bg-white shadow-xs h-full">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#eef1ec] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5759]">
                Left Side • Original Contract Language
              </span>
              <h4 className="text-sm font-semibold text-[#040404] flex items-center gap-2 mt-0.5">
                <BookOpen className="h-4 w-4 text-[#13505b]" />
                <span>Exact Original Clause Text</span>
              </h4>
            </div>

            {/* Section Reference */}
            {(activeClause.evidence.sectionHeading || activeClause.evidence.sourceReferenceText) && (
              <div className="rounded-lg bg-[#f7f8f5] px-3 py-2 text-[11px] text-[#4a5759] border border-[#d7d9ce]">
                <strong className="text-[#040404] font-semibold block">
                  Document Section Reference
                </strong>
                {activeClause.evidence.sectionHeading || activeClause.evidence.sourceReferenceText}
              </div>
            )}

            {/* Verbatim Scroll Container */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5759] flex items-center justify-between">
                <span>Verbatim Passage</span>
                <span className="text-[10px] font-normal text-[#119da4]">
                  Highlighted passage represents key term
                </span>
              </span>
              <div className="rounded-xl border border-[#d7d9ce] bg-[#f7f8f5] p-4 max-h-[380px] overflow-y-auto">
                {renderOriginalTextWithHighlight()}
              </div>
            </div>

            {/* Exact quote inspection snippet */}
            <div className="rounded-lg border border-dashed border-[#d7d9ce] p-3 text-xs text-[#4a5759]">
              <strong className="font-semibold text-[#040404] block mb-0.5">
                Exact Quote Cited:
              </strong>
              &ldquo;{activeClause.evidence.exactQuote}&rdquo;
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL: PLAIN-ENGLISH TRANSLATION */}
        <Card className="border-[#d7d9ce] bg-white shadow-xs h-full">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#eef1ec] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a5759]">
                  Right Side • Plain-English Translation
                </span>
                <h4 className="text-sm font-semibold text-[#040404] flex items-center gap-2 mt-0.5">
                  <FileText className="h-4 w-4 text-[#119da4]" />
                  <span>Plain-English Meaning</span>
                </h4>
              </div>

              {/* Verification Status */}
              <div>{formatVerificationBadge(activeClause.verification.status)}</div>
            </div>

            {/* Plain-Language Explanation */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5759]">
                What this means in simple words
              </span>
              <div className="rounded-xl border border-[#d7d9ce] bg-[#f7f8f5] p-3.5 text-xs sm:text-sm text-[#040404] leading-relaxed">
                {activeClause.analysis.plainLanguageExplanation}
              </div>
            </div>

            {/* Why This Clause Matters */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5759] flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Why this matters to you
              </span>
              <p className="text-xs text-[#040404] leading-relaxed">
                {activeClause.analysis.whyThisClauseMatters}
              </p>
            </div>

            {/* Potential User Implications */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5759]">
                Key takeaways
              </span>
              <ul className="space-y-2 rounded-xl bg-[#f7f8f5] p-3.5 border border-[#d7d9ce]">
                {activeClause.analysis.potentialUserImplications.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#040404] leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#119da4] mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Advice / Recommendation */}
            {activeClause.analysis.actionableAdvice && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase tracking-wide text-[10px] mr-1">
                    What you can do:
                  </span>
                  {activeClause.analysis.actionableAdvice}
                </div>
              </div>
            )}

            {/* Evidence verification notice */}
            <div className="pt-2 border-t border-[#eef1ec] flex items-center justify-between text-[11px] text-[#4a5759]">
              <span>Verified word-for-word against agreement text</span>
              <span>Audit: {new Date(activeClause.verification.verifiedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
