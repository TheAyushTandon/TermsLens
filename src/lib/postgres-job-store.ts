import type { Pool } from "pg";
import { getPool } from "./db.ts";
import type {
  AnalysisJobRecord,
  IJobStore,
} from "./storage-types.ts";
import type { PipelineStage, AnalysisStatus } from "../types/index.ts";

export class PostgresJobStore implements IJobStore {
  private pool: Pool;

  constructor(customPool?: Pool) {
    this.pool = customPool || getPool();
  }

  private mapRow(row: any): AnalysisJobRecord {
    return {
      jobId: row.job_id,
      reportId: row.report_id,
      appName: row.app_name,
      documentType: row.document_type,
      status: row.status,
      currentStage: row.current_stage,
      message: row.message,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      completedAt: row.completed_at
        ? row.completed_at instanceof Date
          ? row.completed_at.toISOString()
          : String(row.completed_at)
        : undefined,
      updatedAt: row.updated_at
        ? row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at)
        : undefined,
      reportUrl: row.report_url || undefined,
      documentText: row.document_text || undefined,
      documentTitle: row.document_title || undefined,
      completedStages: Array.isArray(row.completed_stages)
        ? row.completed_stages
        : typeof row.completed_stages === "string"
        ? JSON.parse(row.completed_stages)
        : [],
      stageData:
        row.stage_data && typeof row.stage_data === "object"
          ? row.stage_data
          : typeof row.stage_data === "string"
          ? JSON.parse(row.stage_data)
          : {},
      error:
        row.error && typeof row.error === "object"
          ? row.error
          : typeof row.error === "string"
          ? JSON.parse(row.error)
          : undefined,
    };
  }

  async get(jobId: string): Promise<AnalysisJobRecord | undefined> {
    const res = await this.pool.query(
      `SELECT * FROM analysis_jobs WHERE job_id = $1 LIMIT 1;`,
      [jobId]
    );

    if (res.rowCount === 0) {
      return undefined;
    }

    return this.mapRow(res.rows[0]);
  }

  async set(jobId: string, record: AnalysisJobRecord): Promise<void> {
    const completedStagesJson = JSON.stringify(record.completedStages || []);
    const stageDataJson = JSON.stringify(record.stageData || {});
    const errorJson = record.error ? JSON.stringify(record.error) : null;

    const query = `
      INSERT INTO analysis_jobs (
        job_id,
        report_id,
        app_name,
        document_type,
        status,
        current_stage,
        message,
        document_text,
        document_title,
        completed_stages,
        stage_data,
        report_url,
        error,
        created_at,
        completed_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13::jsonb,
        COALESCE($14::timestamptz, NOW()),
        $15::timestamptz,
        NOW()
      )
      ON CONFLICT (job_id) DO UPDATE SET
        report_id = EXCLUDED.report_id,
        app_name = EXCLUDED.app_name,
        document_type = EXCLUDED.document_type,
        status = EXCLUDED.status,
        current_stage = EXCLUDED.current_stage,
        message = EXCLUDED.message,
        document_text = COALESCE(EXCLUDED.document_text, analysis_jobs.document_text),
        document_title = COALESCE(EXCLUDED.document_title, analysis_jobs.document_title),
        completed_stages = EXCLUDED.completed_stages,
        stage_data = EXCLUDED.stage_data,
        report_url = EXCLUDED.report_url,
        error = EXCLUDED.error,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW();
    `;

    await this.pool.query(query, [
      jobId,
      record.reportId,
      record.appName,
      record.documentType,
      record.status,
      record.currentStage,
      record.message,
      record.documentText || null,
      record.documentTitle || null,
      completedStagesJson,
      stageDataJson,
      record.reportUrl || null,
      errorJson,
      record.createdAt || null,
      record.completedAt || null,
    ]);
  }

  async has(jobId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM analysis_jobs WHERE job_id = $1 LIMIT 1;`,
      [jobId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(jobId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM analysis_jobs WHERE job_id = $1;`,
      [jobId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM analysis_jobs;`);
  }

  async getIncompleteJobs(): Promise<AnalysisJobRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM analysis_jobs WHERE status IN ('queued', 'processing') ORDER BY created_at ASC;`
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async updateStage(
    jobId: string,
    stage: PipelineStage,
    status: AnalysisStatus,
    message: string,
    stageData?: Record<string, unknown>,
    completedStages?: string[]
  ): Promise<void> {
    const updates: string[] = [
      "current_stage = $2",
      "status = $3",
      "message = $4",
      "updated_at = NOW()",
    ];
    const params: any[] = [jobId, stage, status, message];
    let paramIndex = 5;

    if (stage === "COMPLETED") {
      updates.push(`completed_at = NOW()`);
    }

    if (stageData) {
      updates.push(`stage_data = stage_data || $${paramIndex}::jsonb`);
      params.push(JSON.stringify(stageData));
      paramIndex++;
    }

    if (completedStages && completedStages.length > 0) {
      updates.push(`completed_stages = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(completedStages));
      paramIndex++;
    }

    const query = `
      UPDATE analysis_jobs
      SET ${updates.join(", ")}
      WHERE job_id = $1;
    `;

    await this.pool.query(query, params);
  }
}
