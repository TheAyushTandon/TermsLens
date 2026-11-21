import { PgBoss } from "pg-boss";
import { isPostgresConfigured, getPostgresPoolConfig, getPool } from "./db.ts";

export const POLICY_ANALYSIS_QUEUE = "policy-analysis";

export interface QueueJobPayload {
  jobId: string;
  reportId: string;
}

let bossInstance: PgBoss | null = null;
let isStarting = false;

/**
 * Returns true if background queue infrastructure is configured.
 */
export function isQueueConfigured(): boolean {
  return isPostgresConfigured();
}

/**
 * Returns or initializes the singleton PgBoss instance.
 */
export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance;
  }

  if (isStarting) {
    // Wait for in-flight initialization
    while (isStarting && !bossInstance) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (bossInstance) return bossInstance;
  }

  isStarting = true;
  try {
    const poolConfig = getPostgresPoolConfig();
    const boss = new PgBoss({
      connectionString: poolConfig.connectionString,
      ssl: poolConfig.ssl as any,
      max: 10,
    });

    boss.on("error", (err: Error) => {
      console.error("[PgBoss] Queue error:", err.message);
    });

    await boss.start();
    bossInstance = boss;
    return bossInstance;
  } finally {
    isStarting = false;
  }
}

/**
 * Stops the PgBoss instance (for graceful shutdown or tests).
 */
export async function stopBoss(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop({ graceful: true, timeout: 5000 });
    bossInstance = null;
  }
}

/**
 * Sets a custom PgBoss instance (for testing/mocking).
 */
export function setBossInstance(customBoss: PgBoss | null): void {
  bossInstance = customBoss;
}

/**
 * Enqueues a policy analysis job into pg-boss with deduplication and bounded retries.
 * Queue payload contains only identifiers (jobId, reportId) - never raw document text.
 */
export async function enqueueAnalysisJob(payload: QueueJobPayload): Promise<string | null> {
  if (!isQueueConfigured()) {
    return null;
  }

  const pool = getPool();

  // 1. Transactional Outbox insertion
  const outboxRes = await pool.query(
    `INSERT INTO analysis_outbox (job_id, queue_name, payload, status)
     VALUES ($1, $2, $3::jsonb, 'pending')
     RETURNING id;`,
    [payload.jobId, POLICY_ANALYSIS_QUEUE, JSON.stringify(payload)]
  );
  const outboxId = outboxRes.rows[0]?.id;

  try {
    const boss = await getBoss();

    // 2. Enqueue in pg-boss with idempotency (singletonKey) and bounded retries
    const pgJobId = await boss.send(
      POLICY_ANALYSIS_QUEUE,
      payload,
      {
        singletonKey: payload.jobId,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
        expireInSeconds: 1800, // 30 minutes max execution
      }
    );

    // 3. Mark outbox entry as published
    if (outboxId) {
      await pool.query(
        `UPDATE analysis_outbox SET status = 'published', published_at = NOW() WHERE id = $1;`,
        [outboxId]
      );
    }

    return pgJobId;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (outboxId) {
      await pool.query(
        `UPDATE analysis_outbox SET error_message = $1 WHERE id = $2;`,
        [msg, outboxId]
      );
    }
    throw err;
  }
}

/**
 * Publishes any stranded outbox jobs (called on worker startup for recovery).
 */
export async function processStrandedOutboxJobs(): Promise<number> {
  if (!isPostgresConfigured()) return 0;

  const pool = getPool();
  const res = await pool.query(
    `SELECT id, job_id, payload FROM analysis_outbox
     WHERE status = 'pending'
     ORDER BY id ASC
     LIMIT 100;`
  );

  if (res.rowCount === 0) return 0;

  const boss = await getBoss();
  let recoveredCount = 0;

  for (const row of res.rows) {
    try {
      const payload: QueueJobPayload =
        typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

      await boss.send(
        POLICY_ANALYSIS_QUEUE,
        payload,
        {
          singletonKey: payload.jobId,
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
        }
      );

      await pool.query(
        `UPDATE analysis_outbox SET status = 'published', published_at = NOW() WHERE id = $1;`,
        [row.id]
      );
      recoveredCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE analysis_outbox SET error_message = $1 WHERE id = $2;`,
        [msg, row.id]
      );
    }
  }

  return recoveredCount;
}
