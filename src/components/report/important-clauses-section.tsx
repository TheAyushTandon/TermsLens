"use client";

import * as React from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clause,
  ClauseCategory,
  AttentionLevel,
  VerificationStatus,
} from "@/types";

interface ImportantClausesSectionProps {
  clauses: Clause[];
  selectedClauseId?: string;
  onSelectClause: (clauseId: string) => void;
}

export function ImportantClausesSection({
  clauses,
  selectedClauseId,
  onSelectClause,
}: ImportantClausesSectionProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [attentionFilter, setAttentionFilter] = React.useState<
    AttentionLevel | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = React.useState<
    ClauseCategory | "all"
  >("all");

  const categoryLabels: Record<ClauseCategory, string> = {
    data_collection: "Data Collection",
    data_sharing: "Data Sharing",
    data_retention: "Data Retention",
    subscription_billing: "Subscription & Billing",
    cancellation_refunds: "Cancellation & Refunds",
    intellectual_property: "Intellectual Property",
    dispute_resolution: "Dispute Resolution",
    liability_indemnification: "Liability & Indemnification",
    account_termination: "Account Termination",
    other: "Other",
  };

  const filteredClauses = React.useMemo(() => {
    return clauses.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          c.title.toLowerCase().includes(q) ||
          c.shortExplanation.toLowerCase().includes(q) ||
          c.originalClauseText.toLowerCase().includes(q) ||
          (c.evidence.sectionHeading &&
            c.evidence.sectionHeading.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Attention filter
      if (attentionFilter !== "all" && c.attentionLevel !== attentionFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && c.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [clauses, searchQuery, attentionFilter, categoryFilter]);

  const renderAttentionBadge = (level: AttentionLevel) => {
    switch (level) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50">
            <ShieldAlert className="h-3 w-3" />
            High Attention
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
            <AlertTriangle className="h-3 w-3" />
            Moderate Attention
          </span>
        );
      case "informational":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50">
            <Shield className="h-3 w-3" />
            Informational
          </span>
        );
    }
  };

  const renderVerificationPill = (status: VerificationStatus) => {
    switch (status) {
      case "supported":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Demo Verified — Supported
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Demo Verified — Partially Supported
          </span>
        );
      case "unverified":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <HelpCircle className="h-3 w-3" />
            Not Verified
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            Rejected in Demo Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Important Clauses ({filteredClauses.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any clause to inspect its verbatim text and plain-English breakdown in Clause Explorer.
          </p>
        </div>

        {/* Search Field */}
        <div className="w-full sm:w-64">
          <Input
            id="clause-search-input"
            name="clauseSearch"
            aria-label="Search clauses by keyword"
            placeholder="Search clauses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5" />}
            className="h-8 text-xs bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Filter Tabs and Category Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-xs shadow-xs">
        {/* Attention Level Filter Pills */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <button
            onClick={() => setAttentionFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              attentionFilter === "all"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            All Findings ({clauses.length})
          </button>
          <button
            onClick={() => setAttentionFilter("high")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              attentionFilter === "high"
                ? "bg-white text-rose-700 shadow-xs dark:bg-slate-950 dark:text-rose-400"
                : "text-slate-600 hover:text-rose-600 dark:text-slate-400"
            }`}
          >
            High Attention
          </button>
          <button
            onClick={() => setAttentionFilter("moderate")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              attentionFilter === "moderate"
                ? "bg-white text-amber-700 shadow-xs dark:bg-slate-950 dark:text-amber-400"
                : "text-slate-600 hover:text-amber-600 dark:text-slate-400"
            }`}
          >
            Moderate Attention
          </button>
          <button
            onClick={() => setAttentionFilter("informational")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              attentionFilter === "informational"
                ? "bg-white text-blue-700 shadow-xs dark:bg-slate-950 dark:text-blue-400"
                : "text-slate-600 hover:text-blue-600 dark:text-slate-400"
            }`}
          >
            Informational
          </button>
        </div>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="category-select" className="text-[11px] font-medium text-slate-500">
            Category:
          </label>
          <select
            id="category-select"
            name="categoryFilter"
            aria-label="Filter clauses by category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ClauseCategory | "all")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="dispute_resolution">Dispute Resolution</option>
            <option value="subscription_billing">Subscription & Billing</option>
            <option value="cancellation_refunds">Cancellation & Refunds</option>
            <option value="intellectual_property">Intellectual Property</option>
            <option value="data_collection">Data Collection</option>
            <option value="data_sharing">Data Sharing</option>
            <option value="data_retention">Data Retention</option>
            <option value="liability_indemnification">Liability & Indemnification</option>
            <option value="account_termination">Account Termination</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Clause Cards Grid / List */}
      {filteredClauses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredClauses.map((clause) => {
            const isSelected = clause.id === selectedClauseId;

            return (
              <div
                key={clause.id}
                onClick={() => {
                  onSelectClause(clause.id);
                  // Smoothly scroll to Clause Explorer
                  document.getElementById("clause-explorer")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/20"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                }`}
              >
                {/* Top Row: Category and Attention Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {categoryLabels[clause.category] || clause.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {clause.evidence.sourceReferenceText || "Reference unavailable"}
                    </span>
                  </div>

                  <div>{renderAttentionBadge(clause.attentionLevel)}</div>
                </div>

                {/* Clause Title */}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {clause.title}
                </h3>

                {/* Short Explanation */}
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {clause.shortExplanation}
                </p>

                {/* Bottom Row: Verification status and CTA */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>{renderVerificationPill(clause.verification.status)}</div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                    <span>Inspect Clause</span>
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">
            No clauses match your selected filters. Try resetting the search or category filter.
          </p>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setSearchQuery("");
              setAttentionFilter("all");
              setCategoryFilter("all");
            }}
            className="mt-3 text-xs"
          >
            Reset Filters
          </Button>
        </Card>
      )}
    </div>
  );
}

