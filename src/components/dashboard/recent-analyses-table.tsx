"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { DocumentAnalysis, DocumentType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RecentAnalysesTableProps {
  documents: DocumentAnalysis[];
  onSelectDocument: (doc: DocumentAnalysis) => void;
  onResetFilters: () => void;
  onUploadClick: () => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
}

export function RecentAnalysesTable({
  documents,
  onSelectDocument,
  onResetFilters,
  onUploadClick,
  searchFilter,
  onSearchChange,
}: RecentAnalysesTableProps) {
  const [selectedType, setSelectedType] = React.useState<DocumentType | "all">("all");
  const [onlyFlagged, setOnlyFlagged] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"newest" | "most_flagged" | "appName">("newest");

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
        return "Other";
      default:
        return type;
    }
  };

  const hasRecords = documents.length > 0;
  const isDemonstrationData = documents.some((d) => d.isDemonstrationFixture);

  const filteredDocs = React.useMemo(() => {
    let list = [...documents];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (d) =>
          d.appName.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q)
      );
    }

    if (selectedType !== "all") {
      list = list.filter((d) => d.documentType === selectedType);
    }

    if (onlyFlagged) {
      list = list.filter((d) => d.flaggedClausesCount > 0);
    }

    if (sortBy === "most_flagged") {
      list.sort((a, b) => b.flaggedClausesCount - a.flaggedClausesCount);
    } else if (sortBy === "appName") {
      list.sort((a, b) => a.appName.localeCompare(b.appName));
    } else {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [documents, searchFilter, selectedType, onlyFlagged, sortBy]);

  return (
    <div className="space-y-4">
      {/* Table Section Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Recent Analyses
          </h2>
          {hasRecords && (
            <>
              <Badge variant="secondary" size="sm" className="font-mono text-slate-600">
                {filteredDocs.length} {filteredDocs.length === 1 ? "policy" : "policies"}
              </Badge>
              {isDemonstrationData && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  DEMO DATA
                </span>
              )}
            </>
          )}
        </div>

        {/* Filter Pills - Only show if there are records */}
        {hasRecords && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs">
              <button
                onClick={() => {
                  setSelectedType("all");
                  setOnlyFlagged(false);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "all" && !onlyFlagged
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                All ({documents.length})
              </button>
              <button
                onClick={() => {
                  setSelectedType("terms_of_service");
                  setOnlyFlagged(false);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "terms_of_service"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Terms of Service
              </button>
              <button
                onClick={() => {
                  setSelectedType("privacy_policy");
                  setOnlyFlagged(false);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "privacy_policy"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Privacy Policies
              </button>
              <button
                onClick={() => setOnlyFlagged(!onlyFlagged)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  onlyFlagged
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                With Flags Only
              </button>
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                id="sort-analyses-select"
                name="sortAnalyses"
                aria-label="Sort recent analyses"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "newest" | "most_flagged" | "appName")
                }
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none"
              >
                <option value="newest">Sort: Newest first</option>
                <option value="most_flagged">Sort: Most flagged clauses</option>
                <option value="appName">Sort: App name (A-Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Table / List Container */}
      <Card className="border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        <CardContent className="p-0">
          {hasRecords && filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <th className="py-3 px-4 sm:px-6">App / Service</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Flagged Clauses</th>
                    <th className="py-3 px-4">Analysis Status</th>
                    <th className="py-3 px-4 hidden md:table-cell">Analysis Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredDocs.map((doc) => {
                    const dateStr = new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => onSelectDocument(doc)}
                        className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        {/* App or Service Name */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white font-semibold text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              <FileText className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {doc.appName}
                                </p>
                                {doc.isDemonstrationFixture && (
                                  <span className="rounded border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/40 text-[10px] text-amber-700 dark:text-amber-400 px-1.5 py-0.2 font-medium">
                                    Sample
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {doc.title}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Document Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" size="sm" className="font-normal text-slate-600">
                            {formatDocType(doc.documentType)}
                          </Badge>
                        </td>

                        {/* Flagged Clauses Count */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {doc.flaggedClausesCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{doc.flaggedClausesCount} to review</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/50">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>0 flagged</span>
                            </div>
                          )}
                        </td>

                        {/* Analysis Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="capitalize">{doc.status}</span>
                          </div>
                        </td>

                        {/* Analysis Date */}
                        <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{dateStr}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDocument(doc);
                              }}
                              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Summary
                            </Button>

                            <Link
                              href={`/reports/${doc.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <span>Report</span>
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500">
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                {hasRecords
                  ? "No matching policies found"
                  : "No policy analyses yet"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {hasRecords
                  ? "No records match your active search or filter. Try clearing filters to see all policies."
                  : "You haven't uploaded or analyzed any agreements yet. Choose a sample app or upload a policy to get started."}
              </p>
              <div className="mt-5 flex items-center gap-2">
                {hasRecords ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onResetFilters();
                      setSelectedType("all");
                      setOnlyFlagged(false);
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    onClick={onUploadClick}
                    size="sm"
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    className="text-xs"
                  >
                    Analyze Your First Policy
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Demonstration Data Disclaimer Notice */}
      {hasRecords && isDemonstrationData && (
        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Notice: Demonstration records represent illustrative sample data for testing TermsLens and are not official or verified policies of the listed companies.
          </span>
        </div>
      )}
    </div>
  );
}
