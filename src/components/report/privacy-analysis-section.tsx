"use client";

import * as React from "react";
import {
  ShieldAlert,
  ShieldCheck,
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
  AttentionLevel,
} from "@/types";

interface PrivacyAnalysisSectionProps {
  findings: PrivacyFinding[];
  appName: string;
}

export function PrivacyAnalysisSection({
  findings,
  appName,
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
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50">
            <CheckCircle2 className="h-3 w-3" />
            Explicitly Stated Practice
          </span>
        );
      case "reasonable_interpretation":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50">
            <Info className="h-3 w-3" />
            Reasonable Interpretation
          </span>
        );
      case "not_specified":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
            <AlertTriangle className="h-3 w-3" />
            Not Specified in Document
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Privacy & Data Practices Analysis</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Breakdown of telemetry collection, advertising networks, deletion rights, and artificial intelligence usage.
        </p>
      </div>

      {/* Critical Legal Disclosure Note on Document Silence */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold uppercase tracking-wider text-[11px] mr-1">
            Silence Disclaimer:
          </strong>
          Do not assume that silence in a policy means a practice does not occur. If a document omits data retention caps or third-party sharing specifics, that data may be maintained indefinitely under general operating authority.
        </p>
      </div>

      {/* Grid of Privacy Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {findings.map((item) => {
          const Icon = getTopicIcon(item.topic);

          return (
            <Card
              key={item.id}
              className="border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-3">
                {/* Header: Topic Icon and Distinction Badge */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.topicTitle}
                    </h3>
                  </div>

                  <div>{renderDistinctionBadge(item.distinction)}</div>
                </div>

                {/* Finding Summary */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.summary}
                </p>

                {/* Supporting Document Evidence if explicitly stated */}
                {item.documentEvidence && (
                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Supporting Policy Evidence:
                    </span>
                    &ldquo;{item.documentEvidence}&rdquo;
                  </div>
                )}

                {/* Silence Notice if not specified */}
                {item.silenceNotice && (
                  <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                      Information Not Specified:
                    </span>
                    {item.silenceNotice}
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

