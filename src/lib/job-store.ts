import type {
  PipelineStage,
  AnalysisStatus,
} from "../types/index.ts";
import type {
  AnalysisJobRecord,
  IJobStore,
} from "./storage-types.ts";
import { PostgresJobStore } from "./postgres-job-store.ts";

export type { AnalysisJobRecord, IJobStore };

export class InMemoryJobStore implements IJobStore {
  private jobs = new Map<string, AnalysisJobRecord>();

  get(jobId: string): AnalysisJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  set(jobId: string, record: AnalysisJobRecord): void {
    this.jobs.set(jobId, record);
  }

  has(jobId: string): boolean {
    return this.jobs.has(jobId);
  }

  delete(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  clear(): void {
    this.jobs.clear();
  }

  async getIncompleteJobs(): Promise<AnalysisJobRecord[]> {
    return Array.from(this.jobs.values()).filter(
      (j) => j.status === "queued" || j.status === "processing"
    );
  }

  updateStage(
    jobId: string,
    stage: PipelineStage,
    status: AnalysisStatus,
    message: string,
    stageData?: Record<string, unknown>,
    completedStages?: string[]
  ): void {
    const existing = this.jobs.get(jobId);
    if (!existing) return;

    this.jobs.set(jobId, {
      ...existing,
      currentStage: stage,
      status,
      message,
      updatedAt: new Date().toISOString(),
      ...(stage === "COMPLETED" ? { completedAt: new Date().toISOString() } : {}),
      stageData: {
        ...(existing.stageData || {}),
        ...(stageData || {}),
      },
      completedStages: completedStages || existing.completedStages || [],
    });
  }
}

/**
 * Validates production environment constraints and returns the active storage mode.
 * Fails fast if DATABASE_URL is missing in production.
 */
export function getStorageMode(): "postgres" | "memory" {
  // During next build (phase-production-build), Next.js collects page data and route configuration
  // without executing runtime queries. Allow building without requiring an active PostgreSQL instance.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "memory";
  }

  const isProd = process.env.NODE_ENV === "production";

  if (process.env.TERMSLENS_STORAGE_MODE === "memory") {
    if (isProd) {
      throw new Error(
        "FATAL: TERMSLENS_STORAGE_MODE=memory is strictly forbidden in production. Production requires PostgreSQL persistence."
      );
    }
    return "memory";
  }

  if (isProd) {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
      throw new Error(
        "FATAL: DATABASE_URL environment variable is required in production. TermsLens cannot start with volatile in-memory storage."
      );
    }
    return "postgres";
  }

  // Explicit override or active DATABASE_URL in development
  if (
    process.env.TERMSLENS_STORAGE_MODE === "postgres" ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.trim())
  ) {
    return "postgres";
  }

  return "memory";
}

export function createJobStore(): IJobStore {
  const mode = getStorageMode();
  if (mode === "postgres") {
    return new PostgresJobStore();
  }
  return new InMemoryJobStore();
}

// Global singleton to preserve in-memory state during hot reload in dev
const globalForJobs = globalThis as unknown as {
  __termslens_job_store?: IJobStore;
};

export const jobStore: IJobStore =
  globalForJobs.__termslens_job_store ?? createJobStore();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.__termslens_job_store = jobStore;
}
