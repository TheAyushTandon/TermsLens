import type { Pool } from "pg";
import { getPool } from "./db.ts";
import type { IReportStore } from "./storage-types.ts";
import type { AnalysisReport } from "../types/index.ts";
import { mockReports } from "./mock-reports.ts";

export class PostgresReportStore implements IReportStore {
  private pool: Pool;

  constructor(customPool?: Pool) {
    this.pool = customPool || getPool();
  }

  async get(id: string): Promise<AnalysisReport | undefined> {
    const res = await this.pool.query(
      `SELECT report_json FROM analysis_reports WHERE id = $1 LIMIT 1;`,
      [id]
    );

    if (res.rowCount && res.rowCount > 0) {
      const raw = res.rows[0].report_json;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    }

    // Fall back to seeded demonstration reports
    if (id in mockReports) {
      return mockReports[id];
    }

    return undefined;
  }

  async set(id: string, report: AnalysisReport): Promise<void> {
    const reportJson = JSON.stringify(report);
    const query = `
      INSERT INTO analysis_reports (
        id,
        app_name,
        document_title,
        document_type,
        report_json,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        app_name = EXCLUDED.app_name,
        document_title = EXCLUDED.document_title,
        document_type = EXCLUDED.document_type,
        report_json = EXCLUDED.report_json,
        updated_at = NOW();
    `;

    await this.pool.query(query, [
      id,
      report.appName || "Application",
      report.documentTitle || "Policy Document",
      report.documentType || "terms_of_service",
      reportJson,
    ]);
  }

  async has(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM analysis_reports WHERE id = $1 LIMIT 1;`,
      [id]
    );
    if ((res.rowCount ?? 0) > 0) {
      return true;
    }
    return id in mockReports;
  }

  async getAll(): Promise<AnalysisReport[]> {
    const res = await this.pool.query(
      `SELECT report_json FROM analysis_reports ORDER BY created_at DESC;`
    );
    const dbReports: AnalysisReport[] = res.rows.map((row) =>
      typeof row.report_json === "string"
        ? JSON.parse(row.report_json)
        : row.report_json
    );

    // Merge in mock reports if not overridden in db
    const existingIds = new Set(dbReports.map((r) => r.id));
    for (const [id, mock] of Object.entries(mockReports)) {
      if (!existingIds.has(id)) {
        dbReports.push(mock);
      }
    }

    return dbReports;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM analysis_reports WHERE id = $1;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM analysis_reports;`);
  }
}
