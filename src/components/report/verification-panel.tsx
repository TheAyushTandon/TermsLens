"use client";

import * as React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  SearchCheck,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Clause, VerificationSummary, VerificationStatus } from "@/types";

interface VerificationPanelProps {
  clauses: Clause[];
  summary: VerificationSummary;
}

export function VerificationPanel({
  clauses,
  summary,
}: VerificationPanelProps) {
  const [expandedClauseId, setExpandedClauseId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedClauseId((prev) => (prev === id ? null : id));
  };

  const renderStatusPill = (status: VerificationStatus) => {
    switch (status) {
      case "supported":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Demo Verified — Supported</span>
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>Demo Verified — Partially Supported</span>
          </span>
        );
      case "unverified":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            <HelpCircle className="h-3 w-3 text-slate-500" />
            <span>Not Verified</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <XCircle className="h-3 w-3 text-rose-600" />
            <span>Rejected in Demo Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          <SearchCheck className="h-4 w-4 text-[#119da4]" />
          <span>AI Evidence & Source Verification</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited traceability connecting each AI explanation to verbatim source document evidence without fabricated confidence scores.
        </p>
      </div>

      {/* Summary Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="truncate">Demo Verified — Supported</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900">
            {summary.supportedCount}
          </div>
          <p className="text-[10px] text-slate-400">Verbatim text confirmed</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="truncate">Demo Verified — Partially</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900">
            {summary.partiallySupportedCount}
          </div>
          <p className="text-[10px] text-slate-400">Inferred from context</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            <span className="truncate">Not Verified</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900">
            {summary.unverifiedCount}
          </div>
          <p className="text-[10px] text-slate-400">Needs human audit</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span className="truncate">Rejected in Demo</span>
          </div>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-900">
            {summary.rejectedCount}
          </div>
          <p className="text-[10px] text-slate-400">Excluded as inaccurate</p>
        </div>
      </div>

      {/* Methodology Description Note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 leading-relaxed space-y-1">
        <p>
          <strong className="font-semibold text-slate-800">
            Verification Methodology Notice:
          </strong>{" "}
          Verification outcomes shown here are simulated for demonstration purposes. They do not represent a live independent verification service.
        </p>
        {summary.methodologyDescription && (
          <p className="text-[11px] text-slate-500">
            {summary.methodologyDescription}
          </p>
        )}
      </div>

      {/* Interactive Evidence Inspection List */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
          Inspect Finding Evidence ({clauses.length} items)
        </span>

        {clauses.map((clause) => {
          const isExpanded = expandedClauseId === clause.id;

          return (
            <Card
              key={clause.id}
              className="border-slate-200/90 bg-white overflow-hidden shadow-xs transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleExpand(clause.id)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {clause.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {clause.evidence.sourceReferenceText || "Reference unavailable"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {renderStatusPill(clause.verification.status)}

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Evidence Inspection Area */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 text-xs">
                  {/* Quoted source passage */}
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Verbatim Document Quote
                    </span>
                    <p className="font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      &ldquo;{clause.evidence.exactQuote}&rdquo;
                    </p>
                  </div>

                  {/* Simulated Reviewer Audit Outcome */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200/80 p-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Reviewer Assessment
                      </span>
                      <p className="text-slate-700">
                        {clause.verification.notes}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 p-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Simulated Audit Result
                      </span>
                      <p className="text-slate-700 font-mono text-[11px]">
                        {clause.verification.simulatedAuditOutcome ||
                          "Source text matches finding definition without textual contradiction."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

