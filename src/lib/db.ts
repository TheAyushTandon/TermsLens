import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

/**
 * Returns true if DATABASE_URL is present and non-empty.
 */
export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0);
}

/**
 * Parses connection options and configures SSL safely for PostgreSQL.
 */
export function getPostgresPoolConfig(preferUnpooled = false): pg.PoolConfig {
  const connectionString =
    (preferUnpooled && process.env.DATABASE_URL_UNPOOLED) || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const isLocalhost =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const poolConfig: pg.PoolConfig = {
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Enable SSL for cloud PostgreSQL (Neon, Supabase, RDS) or when explicitly requested
  if (
    !isLocalhost ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true")
  ) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return poolConfig;
}

/**
 * Returns the singleton PostgreSQL pool.
 */
export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(getPostgresPoolConfig());

    poolInstance.on("error", (err: Error) => {
      console.error("[PostgresPool] Unexpected client error:", err.message);
    });
  }

  return poolInstance;
}

/**
 * Closes the active pool (for graceful shutdown and isolated test teardown).
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

/**
 * Sets a custom pool instance (useful for unit/integration tests with mocked or ephemeral pools).
 */
export function setPoolInstance(customPool: pg.Pool | null): void {
  poolInstance = customPool;
}

/**
 * Executes versioned migrations idempotently.
 */
export async function runMigrations(customPool?: pg.Pool): Promise<string[]> {
  const activePool = customPool || getPool();
  const client = await activePool.connect();

  try {
    await client.query("BEGIN;");

    // Acquire an advisory lock to prevent race conditions during multi-process startup
    await client.query("SELECT pg_advisory_xact_lock(737651);");

    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const migrationFiles = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
      : [];

    const appliedVersions: string[] = [];

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/, "");
      const res = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1;",
        [version]
      );

      if (res.rowCount === 0) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, description) VALUES ($1, $2);",
          [version, `Migration applied from ${file}`]
        );
        appliedVersions.push(version);
      }
    }

    await client.query("COMMIT;");
    return appliedVersions;
  } catch (err) {
    await client.query("ROLLBACK;");
    throw err;
  } finally {
    client.release();
  }
}
