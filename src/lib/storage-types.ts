import type {
  PipelineStage,
  AnalysisStatus,
  DocumentType,
  AnalysisReport,
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
  updatedAt?: string;
  reportUrl?: string;
  documentText?: string;
  documentTitle?: string;
  completedStages?: string[];
  stageData?: Record<string, unknown>;
  error?: ApiError;
}

export interface IJobStore {
  get(jobId: string): Promise<AnalysisJobRecord | undefined> | AnalysisJobRecord | undefined;
  set(jobId: string, record: AnalysisJobRecord): Promise<void> | void;
  has(jobId: string): Promise<boolean> | boolean;
  delete(jobId: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
  getIncompleteJobs?(): Promise<AnalysisJobRecord[]>;
  updateStage?(
    jobId: string,
    stage: PipelineStage,
    status: AnalysisStatus,
    message: string,
    stageData?: Record<string, unknown>,
    completedStages?: string[]
  ): Promise<void> | void;
}

export interface IReportStore {
  get(id: string): Promise<AnalysisReport | undefined> | AnalysisReport | undefined;
  set(id: string, report: AnalysisReport): Promise<void> | void;
  has(id: string): Promise<boolean> | boolean;
  getAll(): Promise<AnalysisReport[]> | AnalysisReport[];
  delete(id: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
}
