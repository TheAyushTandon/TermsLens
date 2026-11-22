import { NextResponse, connection } from "next/server.js";
import { reportStore } from "../../../lib/report-store.ts";
import type {
  AnalysisReport,
  DocumentAnalysis,
  ConsumerStats,
  RiskLevel,
} from "../../../types/index.ts";

export async function GET(request: Request) {
  try {
    await connection();
    const rawReports = await reportStore.getAll();

    const reports: DocumentAnalysis[] = rawReports.map((rep: AnalysisReport) => {
      const flagged =
        (rep.highAttentionCount || 0) + (rep.moderateAttentionCount || 0);
      const riskLevel: RiskLevel =
        (rep.highAttentionCount || 0) > 0
          ? "high"
          : (rep.moderateAttentionCount || 0) > 0
          ? "medium"
          : "safe";

      const clausesCount =
        rep.totalClausesAnalyzed || rep.clauses?.length || 0;
      const readingTime = Math.max(5, Math.round(clausesCount * 1.5));
      const timeSaved = Math.max(3, Math.round(clausesCount * 1.2));

      return {
        id: rep.id,
        title: rep.documentTitle || `${rep.appName} Agreement`,
        appName: rep.appName,
        documentType: rep.documentType || "terms_of_service",
        status: "completed",
        riskScore: Math.min(
          100,
          (rep.highAttentionCount || 0) * 25 +
            (rep.moderateAttentionCount || 0) * 10
        ),
        riskLevel,
        clausesCount,
        flaggedClausesCount: flagged,
        privacyFindingsCount: rep.privacyFindings?.length || 0,
        summary:
          rep.documentSummary ||
          rep.executiveSummary?.documentOverview ||
          "Operative terms and consumer rights extracted from policy document.",
        createdAt: rep.analysisDate || new Date().toISOString(),
        estimatedReadingTimeMinutes: readingTime,
        timeSavedMinutes: timeSaved,
        isDemonstrationFixture: rep.isDemonstrationFixture ?? false,
        illustrativeNotice: rep.demonstrationNotice,
        findings: (rep.clauses || []).map((c) => ({
          id: c.id,
          category: "arbitration" as const,
          title: c.title,
          riskLevel:
            c.attentionLevel === "high"
              ? "high"
              : c.attentionLevel === "moderate"
              ? "medium"
              : "safe",
          excerpt: c.originalClauseText,
          explanation: c.shortExplanation,
          recommendation:
            c.analysis?.actionableAdvice ||
            c.analysis?.whyThisClauseMatters ||
            "",
        })),
      };
    });

    const stats: ConsumerStats = {
      documentsAnalyzed: reports.length,
      clausesRequiringAttention: reports.reduce(
        (acc, r) => acc + r.flaggedClausesCount,
        0
      ),
      privacyRelatedFindings: reports.reduce(
        (acc, r) => acc + (r.privacyFindingsCount || 0),
        0
      ),
      readingTimeSavedMinutes: reports.reduce(
        (acc, r) => acc + r.timeSavedMinutes,
        0
      ),
      isDemoData: reports.every((r) => r.isDemonstrationFixture),
    };

    return NextResponse.json(
      {
        success: true,
        reports,
        stats,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load reports.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
