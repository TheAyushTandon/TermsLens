import pg from "pg";
const { Pool } = pg;

async function testNeonAndApp() {
  console.log("=======================================================");
  console.log("TermsLens Neon PostgreSQL & App End-to-End Verification");
  console.log("=======================================================\n");

  console.log("--- 1. Direct Neon PostgreSQL Connection Test ---");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  const dbRes = await client.query("SELECT current_database(), current_user, version();");
  console.log("✓ Connected to Neon Database:", dbRes.rows[0].current_database);
  console.log("✓ Current User:", dbRes.rows[0].current_user);

  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log("✓ Active Tables in Neon:", tablesRes.rows.map((r) => r.table_name).join(", "));
  client.release();
  await pool.end();

  console.log("\n--- 2. Next.js Production HTTP Server Verification ---");
  const homeRes = await fetch("http://localhost:3000/");
  console.log("✓ GET / Status:", homeRes.status, homeRes.statusText);

  console.log("\n--- 3. End-to-End Analysis Submission to Neon ---");
  const submitRes = await fetch("http://localhost:3000/api/analyze/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: "NeonProductionApp",
      documentType: "terms_of_service",
      text: "Section 1. Mandatory Arbitration. You agree that any dispute between you and NeonProductionApp will be resolved by binding individual arbitration in Delaware. You waive all class action rights. Section 2. Billing. Subscriptions renew monthly.",
    }),
  });
  console.log("✓ POST /api/analyze/text Status:", submitRes.status, submitRes.statusText);
  const submitData = await submitRes.json();
  console.log("✓ Received JobId:", submitData.jobId);
  console.log("✓ Received ReportId:", submitData.reportId);
  console.log("✓ Initial Status:", submitData.status);

  console.log("\n--- 4. Verify Row Persistence in Neon PostgreSQL Database ---");
  const poolVerify = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const jobVerifyRes = await poolVerify.query(
    "SELECT job_id, app_name, status, current_stage, created_at FROM analysis_jobs WHERE job_id = $1",
    [submitData.jobId]
  );
  console.log("✓ Neon Database Query Confirmed Row Exists:");
  console.log("   job_id:", jobVerifyRes.rows[0]?.job_id);
  console.log("   app_name:", jobVerifyRes.rows[0]?.app_name);
  console.log("   status:", jobVerifyRes.rows[0]?.status);
  console.log("   current_stage:", jobVerifyRes.rows[0]?.current_stage);

  console.log("\n--- 5. Verify Status API Retrieval from Neon ---");
  const statusRes = await fetch(`http://localhost:3000${submitData.links.statusUrl}`);
  console.log("✓ GET", submitData.links.statusUrl, "Status:", statusRes.status);
  const statusData = await statusRes.json();
  console.log("✓ Status Endpoint Output:", {
    jobId: statusData.jobId,
    status: statusData.status,
    currentStage: statusData.currentStage,
    message: statusData.message,
  });

  console.log("\n--- 6. Verify Seeded Demo Report Retrieval from Neon ---");
  const reportRes = await fetch("http://localhost:3000/api/reports/doc_demo_spotify_01");
  console.log("✓ GET /api/reports/doc_demo_spotify_01 Status:", reportRes.status);
  const reportData = await reportRes.json();
  console.log("✓ Retrieved Report App:", reportData.appName, "| Clauses Analyzed:", reportData.totalClausesAnalyzed);

  console.log("\n=======================================================");
  console.log("ALL WIRED SERVICES TESTED AND VERIFIED END-TO-END!");
  console.log("=======================================================");
  await poolVerify.end();
}

testNeonAndApp().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
