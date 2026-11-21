-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema for TermsLens durable persistence, job tracking,
--              report storage, and transactional outbox.
-- ==============================================================================

-- 1. Schema Migrations Audit Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Analysis Jobs Table
CREATE TABLE IF NOT EXISTS analysis_jobs (
  job_id VARCHAR(128) PRIMARY KEY,
  report_id VARCHAR(128) NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  current_stage VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  document_text TEXT,
  document_title VARCHAR(255),
  completed_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  stage_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_url VARCHAR(255),
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for status polling, dashboard recency, and cleanup
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_report_id ON analysis_jobs(report_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_app_name ON analysis_jobs(app_name);

-- 3. Analysis Reports Table
CREATE TABLE IF NOT EXISTS analysis_reports (
  id VARCHAR(128) PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  document_type VARCHAR(64) NOT NULL,
  report_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for report lookup and listing
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_app_name ON analysis_reports(app_name);

-- 4. Transactional Outbox Table for At-Least-Once Durable Queue Delivery
CREATE TABLE IF NOT EXISTS analysis_outbox (
  id BIGSERIAL PRIMARY KEY,
  job_id VARCHAR(128) NOT NULL,
  queue_name VARCHAR(64) NOT NULL DEFAULT 'policy-analysis',
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analysis_outbox_status_id ON analysis_outbox(status, id ASC);
CREATE INDEX IF NOT EXISTS idx_analysis_outbox_job_id ON analysis_outbox(job_id);
