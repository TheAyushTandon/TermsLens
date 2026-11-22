"use client";

import * as React from "react";
import {
  ShieldAlert,
  Eye,
  Share2,
  Trash2,
  Cpu,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  PrivacyFinding,
  PrivacyDistinction,
  PrivacyTopic,
} from "@/types";

interface PrivacyAnalysisSectionProps {
  findings: PrivacyFinding[];
  appName: string;
}

export function PrivacyAnalysisSection({
  findings,
}: PrivacyAnalysisSectionProps) {
  const getTopicIcon = (topic: PrivacyTopic) => {
    switch (topic) {
      case "personal_info_collected":
        return Eye;
      case "third_party_sharing":
        return Share2;
      case "advertising_tracking":
        return ShieldAlert;
      case "data_retention":
        return Clock;
      case "account_deletion":
        return Trash2;
      case "ai_model_training":
        return Cpu;
      default:
        return Lock;
    }
  };

  const renderDistinctionBadge = (distinction: PrivacyDistinction) => {
    switch (distinction) {
      case "explicitly_stated":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Explicitly Stated in Policy
          </span>
        );
      case "reasonable_interpretation":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#e5ebe9] px-2 py-0.5 text-[10px] font-semibold text-[#0c7489] border border-[#d7d9ce]">
            <Info className="h-3 w-3" />
            Reasonable Interpretation
          </span>
        );
      case "not_specified":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Not Mentioned in Document
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[#040404] flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#119da4]" />
          <span>Privacy & Data Collection Breakdown</span>
        </h2>
        <p className="text-xs text-[#4a5759] mt-0.5">
          Find out what personal data is gathered, who it gets shared with, and if you can delete it.
        </p>
      </div>

      {/* Critical Legal Disclosure Note on Document Silence */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold uppercase tracking-wider text-[11px] mr-1">
            Silence Disclaimer:
          </strong>
          If an agreement is silent on a practice (such as data retention or AI training), that does NOT guarantee they do not do it. It simply means the supplied text omitted specific limits.
        </p>
      </div>

      {/* Privacy Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {findings.map((finding) => {
          const Icon = getTopicIcon(finding.topic);
          return (
            <Card
              key={finding.topic}
              className="border-[#d7d9ce] bg-white transition-all duration-150 hover:border-[#119da4] shadow-xs"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#eef1ec] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef1ec] text-[#119da4]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold text-[#040404]">
                      {finding.topicTitle}
                    </h3>
                  </div>
                  <div>{renderDistinctionBadge(finding.distinction)}</div>
                </div>

                {/* Finding Explanation */}
                <p className="text-xs text-[#040404] leading-relaxed">
                  {finding.summary}
                </p>

                {/* Verbatim Supporting Evidence (if present) */}
                {finding.documentEvidence ? (
                  <div className="rounded-lg border border-dashed border-[#d7d9ce] bg-[#f7f8f5] p-2.5 text-[11px] text-[#4a5759] space-y-1">
                    <strong className="font-semibold text-[#040404] block">
                      Supporting Policy Evidence:
                    </strong>
                    <blockquote className="italic font-serif leading-relaxed text-[#040404]">
                      &ldquo;{finding.documentEvidence}&rdquo;
                    </blockquote>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50/60 p-2 text-[11px] text-amber-800 border border-amber-200/60">
                    <span className="font-semibold mr-1">Information Not Specified:</span>
                    {finding.silenceNotice || "This policy does not specify details regarding this privacy practice."}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
