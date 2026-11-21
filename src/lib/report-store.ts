import type { AnalysisReport } from "../types/index.ts";
import type { IReportStore } from "./storage-types.ts";
import { InMemoryReportStore, clientReportStore } from "./in-memory-report-store.ts";
import { PostgresReportStore } from "./postgres-report-store.ts";
import { getStorageMode } from "./job-store.ts";

export type { IReportStore };
export { InMemoryReportStore, clientReportStore };

export function createReportStore(): IReportStore {
  const mode = getStorageMode();
  if (mode === "postgres") {
    return new PostgresReportStore();
  }
  return clientReportStore;
}

// Global singleton to preserve reports across hot reloads and Next.js route invocations
const globalForReports = globalThis as unknown as {
  __termslens_report_store?: IReportStore;
};

export const reportStore: IReportStore =
  globalForReports.__termslens_report_store ?? createReportStore();

if (process.env.NODE_ENV !== "production") {
  globalForReports.__termslens_report_store = reportStore;
}
