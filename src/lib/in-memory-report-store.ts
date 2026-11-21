import type { AnalysisReport } from "../types/index.ts";
import type { IReportStore } from "./storage-types.ts";
import { mockReports } from "./mock-reports.ts";

/**
 * Pure in-memory report store for client-side demo adapters, offline testing,
 * and browser dashboard rendering. Contains zero Node.js server dependencies.
 */
export class InMemoryReportStore implements IReportStore {
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

export const clientReportStore = new InMemoryReportStore();
