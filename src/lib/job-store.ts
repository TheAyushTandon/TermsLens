import type {
  PipelineStage,
  AnalysisStatus,
  DocumentType,
  ApiError,
} from "../types/index.ts";

export interface AnalysisJobRecord {
  jobId: string;
  reportId: string;
  appName: string;
  documentType: DocumentType;
  status: AnalysisStatus;
  currentStage: PipelineStage;
  message: string;
  createdAt: string;
  completedAt?: string;
  reportUrl?: string;
  error?: ApiError;
}

class JobStore {
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
}

const globalForJobs = globalThis as unknown as {
  __termslens_job_store?: JobStore;
};

export const jobStore = globalForJobs.__termslens_job_store ?? new JobStore();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.__termslens_job_store = jobStore;
}
