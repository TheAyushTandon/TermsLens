#!/usr/bin/env node
import pg from "pg";
import { runMigrations, getPostgresPoolConfig, closePool } from "../src/lib/db.ts";

async function main() {
  console.log("=======================================================");
  console.log("TermsLens Database Migration Runner");
  console.log("=======================================================\n");

  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    console.error("ERROR: DATABASE_URL environment variable is required to run migrations.");
    process.exit(1);
  }

  const poolConfig = getPostgresPoolConfig(true);
  const migrationPool = new pg.Pool(poolConfig);

  try {
    console.log("Connecting to database and applying pending migrations...");
    const applied = await runMigrations(migrationPool);
    if (applied.length === 0) {
      console.log("Database is already up to date. No new migrations applied.");
    } else {
      console.log(`Successfully applied ${applied.length} migration(s):`);
      for (const version of applied) {
        console.log(`  ✓ ${version}`);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Migration failed:", msg);
    process.exit(1);
  } finally {
    await migrationPool.end();
    await closePool();
  }
}

main();
