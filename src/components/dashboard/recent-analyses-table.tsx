"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Calendar,
  Layers,
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
  onResetFilters,
  onUploadClick,
  searchFilter,
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
        return "Agreement";
      default:
        return type;
    }
  };

  const hasRecords = documents.length > 0;

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
          <h2 className="text-base font-semibold tracking-tight text-[#040404]">
            Recent Analyses
          </h2>
          {hasRecords && (
            <Badge variant="secondary" size="sm" className="font-mono bg-[#eef1ec] text-[#13505b]">
              {filteredDocs.length} {filteredDocs.length === 1 ? "policy" : "policies"}
            </Badge>
          )}
        </div>

        {/* Filter Pills - Only show if there are records */}
        {hasRecords && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#eef1ec] p-1 text-xs">
              <button
                onClick={() => {
                  setSelectedType("all");
                  setOnlyFlagged(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "all" && !onlyFlagged
                    ? "bg-white text-[#040404] shadow-xs font-semibold"
                    : "text-[#4a5759] hover:text-[#040404]"
                }`}
              >
                All ({documents.length})
              </button>
              <button
                onClick={() => {
                  setSelectedType("terms_of_service");
                  setOnlyFlagged(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "terms_of_service"
                    ? "bg-white text-[#040404] shadow-xs font-semibold"
                    : "text-[#4a5759] hover:text-[#040404]"
                }`}
              >
                Terms of Service
              </button>
              <button
                onClick={() => {
                  setSelectedType("privacy_policy");
                  setOnlyFlagged(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "privacy_policy"
                    ? "bg-white text-[#040404] shadow-xs font-semibold"
                    : "text-[#4a5759] hover:text-[#040404]"
                }`}
              >
                Privacy Policies
              </button>
              <button
                onClick={() => setOnlyFlagged(!onlyFlagged)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  onlyFlagged
                    ? "bg-white text-[#040404] shadow-xs font-semibold"
                    : "text-[#4a5759] hover:text-[#040404]"
                }`}
              >
                With Flags Only
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              aria-label="Sort recent analyses"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "most_flagged" | "appName")}
              className="h-8 rounded-lg border border-[#d7d9ce] bg-white px-2.5 text-xs text-[#040404] focus:outline-none focus:ring-2 focus:ring-[#119da4]/20"
            >
              <option value="newest">Sort: Newest first</option>
              <option value="most_flagged">Sort: Most flagged clauses</option>
              <option value="appName">Sort: App name (A-Z)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="border-[#d7d9ce] bg-white overflow-hidden shadow-xs">
        <CardContent className="p-0">
          {filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#040404]">
                <thead className="border-b border-[#eef1ec] bg-[#f7f8f5] text-[10px] font-semibold uppercase tracking-wider text-[#4a5759]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">App / Service</th>
                    <th className="py-3 px-4 font-semibold hidden sm:table-cell">Document Type</th>
                    <th className="py-3 px-4 font-semibold">Flagged Clauses</th>
                    <th className="py-3 px-4 font-semibold">Analysis Status</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Analysis Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ec]">
                  {filteredDocs.map((doc) => {
                    const dateStr = new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr
                        key={doc.id}
                        className="group transition-colors hover:bg-[#f7f8f5]"
                      >
                        {/* App Name and Title */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/reports/${doc.id}`}
                            className="block group-hover:text-[#119da4] transition-colors"
                          >
                            <div className="font-semibold text-xs text-[#040404] group-hover:text-[#119da4] transition-colors flex items-center gap-1.5">
                              <span>{doc.appName}</span>
                            </div>
                            <div className="text-[11px] text-[#4a5759] truncate max-w-xs sm:max-w-sm mt-0.5">
                              {doc.title}
                            </div>
                          </Link>
                        </td>

                        {/* Document Type */}
                        <td className="py-3.5 px-4 hidden sm:table-cell whitespace-nowrap text-xs text-[#4a5759]">
                          {formatDocType(doc.documentType)}
                        </td>

                        {/* Flagged Clauses Count */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {doc.flaggedClausesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-[#c93b2b]">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>{doc.flaggedClausesCount} to review</span>
                            </span>
                          ) : (
                            <span className="text-[#4a5759]">
                              0 flagged
                            </span>
                          )}
                        </td>

                        {/* Analysis Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[#040404] font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#119da4]" />
                            <span className="capitalize">{doc.status}</span>
                          </div>
                        </td>

                        {/* Analysis Date */}
                        <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap text-[11px] text-[#4a5759]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-[#4a5759]" />
                            <span>{dateStr}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link href={`/reports/${doc.id}`}>
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs border-[#d7d9ce] text-[#119da4] hover:bg-[#eef1ec] hover:text-[#0c7489] font-medium"
                            >
                              <span>Read Breakdown</span>
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1ec] text-[#13505b]">
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#040404]">
                {hasRecords
                  ? "No matching policies found"
                  : "No policy analyses yet"}
              </h3>
              <p className="mt-1 text-xs text-[#4a5759] max-w-sm">
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
                    className="text-xs border-[#d7d9ce]"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    onClick={onUploadClick}
                    size="sm"
                    leftIcon={<FileText className="h-3.5 w-3.5" />}
                    className="text-xs bg-[#119da4] hover:bg-[#0c7489] text-white"
                  >
                    Scan Your First Policy
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
