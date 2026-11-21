import type { AnalysisReport } from "../types/index.ts";
import { mockReports } from "./mock-reports.ts";

/**
 * In-memory report repository for storing and retrieving dynamically generated reports.
 * Seeds with existing production demonstration mock reports (Spotify, Instagram, Discord).
 */
class ReportStore {
  private reports = new Map<string, AnalysisReport>();

  constructor() {
    // Seed with existing mock reports
    for (const [id, report] of Object.entries(mockReports)) {
      this.reports.set(id, report);
    }
  }

  get(id: string): AnalysisReport | undefined {
    return this.reports.get(id);
  }

  set(id: string, report: AnalysisReport): void {
    this.reports.set(id, report);
  }

  has(id: string): boolean {
    return this.reports.has(id);
  }

  getAll(): AnalysisReport[] {
    return Array.from(this.reports.values());
  }

  delete(id: string): boolean {
    return this.reports.delete(id);
  }

  clear(): void {
    this.reports.clear();
  }
}

// Global singleton to preserve reports across hot reloads and Next.js route invocations
const globalForReports = globalThis as unknown as {
  __termslens_report_store?: ReportStore;
};

export const reportStore =
  globalForReports.__termslens_report_store ?? new ReportStore();

if (process.env.NODE_ENV !== "production") {
  globalForReports.__termslens_report_store = reportStore;
}
