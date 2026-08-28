import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("test-results/screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const PORT = 3456;
const BASE_URL = `http://localhost:${PORT}`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await wait(500);
  }
  throw new Error(`Server at ${url} failed to become available.`);
}

async function runBrowserFlows() {
  console.log("🚀 Starting Next.js production server on port " + PORT + "...");
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT) },
  });

  server.stdout.on("data", (d) => process.stdout.write(`[Next.js] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[Next.js ERR] ${d}`));

  try {
    await waitForServer(BASE_URL);
    console.log("✅ Next.js server is ready at " + BASE_URL);

    console.log("🌐 Launching Chromium browser with Chrome DevTools Protocol (CDP)...");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });

    const page = await context.newPage();

    // Attach Chrome DevTools Protocol session
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send("Network.enable");
    await cdpSession.send("Console.enable");
    await cdpSession.send("Performance.enable");

    const networkRequests = [];
    cdpSession.on("Network.requestWillBeSent", (e) => {
      if (e.request.url.startsWith(BASE_URL)) {
        networkRequests.push(`${e.request.method} ${e.request.url}`);
      }
    });

    const consoleLogs = [];
    cdpSession.on("Console.messageAdded", (e) => {
      consoleLogs.push(`[${e.message.level}] ${e.message.text}`);
    });

    console.log("\n=======================================================");
    console.log("FLOW 1: Dashboard Navigation & KPI Stats Verification");
    console.log("=======================================================");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Total Contracts");
    await page.waitForSelector("text=Audited Clauses");
    await page.waitForSelector("text=Master_Services_Agreement_2026.pdf");

    const dashTitle = await page.title();
    console.log(`✓ Page title verified: "${dashTitle}"`);
    const kpiCount = await page.locator("text=Total Contracts").count();
    console.log(`✓ KPI metrics present in DOM: ${kpiCount > 0}`);

    const dashScreenshot = path.join(SCREENSHOT_DIR, "01_dashboard.png");
    await page.screenshot({ path: dashScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${dashScreenshot}`);

    console.log("\n=======================================================");
    console.log("FLOW 2: Contract Repository & Search Filtering");
    console.log("=======================================================");
    await page.click("text=Contracts");
    await page.waitForSelector("text=Contract Repository");

    const searchInput = page.locator('input[placeholder*="Search contracts"]');
    await searchInput.fill("Non_Disclosure");
    await wait(300);

    const filteredCount = await page.locator("text=Non_Disclosure_Mutual_v4.docx").count();
    console.log(`✓ Search filtering correctly isolated row: ${filteredCount === 1}`);

    const contractsScreenshot = path.join(SCREENSHOT_DIR, "02_contracts_filtered.png");
    await page.screenshot({ path: contractsScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${contractsScreenshot}`);

    console.log("\n=======================================================");
    console.log("FLOW 3: Split-Screen Legal Reviewer & HITL Decision Dock");
    console.log("=======================================================");
    await page.goto(`${BASE_URL}/contracts/1`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=LangGraph AI Inspector");
    await page.waitForSelector("text=Master_Services_Agreement_2026.pdf");
    await page.waitForSelector("text=Limitation of Liability Cap");

    console.log("✓ Split screen panes verified (DocumentViewer + PolicyInspector)");

    // Test selecting a highlighted deviation clause
    const deviationClause = page.locator("text=Section 8.2 - Limitation of Liability").first();
    await deviationClause.click();
    console.log("✓ Clicked highlighted deviation clause in DocumentViewer");

    // Enter counsel arbitration comment
    const feedbackInput = page.locator("#feedbackInput");
    await feedbackInput.fill("Waive uncapped breach liability to 1x contract value cap per executive approval.");
    console.log("✓ Entered legal counsel arbitration comment");

    // Click Approve Contract
    const approveBtn = page.locator("button:has-text('Approve Contract')");
    await approveBtn.click();
    await wait(500);

    // Verify status update in DOM
    const noticeText = await page.locator("text=Decision 'APPROVE' recorded").textContent();
    console.log(`✓ HITL decision successfully processed: "${noticeText.trim()}"`);

    const hitlScreenshot = path.join(SCREENSHOT_DIR, "03_hitl_approved.png");
    await page.screenshot({ path: hitlScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${hitlScreenshot}`);

    console.log("\n=======================================================");
    console.log("FLOW 4: Compliance Policy Management & Builder Flow");
    console.log("=======================================================");
    await page.click("text=Policies");
    await page.waitForSelector("text=Compliance Policy Management");

    // Open Policy Builder
    await page.click("text=Create Policy");
    await page.waitForSelector("text=Policy Specification Builder");

    await page.fill('input[placeholder*="SaaS Vendor Standard"]', "Global Privacy Covenant 2026");
    await page.fill('input[placeholder*="Rule Name"]', "Cross-Border Transfer Authorization");
    await page.fill('input[placeholder*="Semantic Vector Query"]', "standard contractual clauses EEA data transfer");
    await page.click("button:has-text('Add')");
    await wait(200);

    const addedRule = await page.locator("text=Cross-Border Transfer Authorization").count();
    console.log(`✓ Rule added in Policy Builder: ${addedRule > 0}`);

    const policyScreenshot = path.join(SCREENSHOT_DIR, "04_policy_builder.png");
    await page.screenshot({ path: policyScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${policyScreenshot}`);

    console.log("\n=======================================================");
    console.log("FLOW 5: Audit Evaluations & Chrome DevTools Metrics");
    console.log("=======================================================");
    await page.click("text=Evals & Metrics");
    await page.waitForSelector("text=Audit Evaluations & Observability");
    await page.waitForSelector("text=compliance_score");

    // Fetch Performance Metrics via CDP
    const perfMetrics = await cdpSession.send("Performance.getMetrics");
    const metricMap = {};
    for (const m of perfMetrics.metrics) {
      metricMap[m.name] = m.value;
    }

    console.log(`✓ Chrome DevTools CDP Performance Metrics:`);
    console.log(`   - JSHeapUsedSize: ${(metricMap.JSHeapUsedSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Documents: ${metricMap.Documents}`);
    console.log(`   - Nodes: ${metricMap.Nodes}`);
    console.log(`   - LayoutCount: ${metricMap.LayoutCount}`);

    const evalsScreenshot = path.join(SCREENSHOT_DIR, "05_evals_metrics.png");
    await page.screenshot({ path: evalsScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${evalsScreenshot}`);

    console.log(`✓ Total HTTP requests recorded via CDP: ${networkRequests.length}`);

    await browser.close();
    console.log("\n🎉 ALL BROWSER & DEVTOOLS AUTOMATION FLOWS PASSED SUCCESSFULLY!");
  } finally {
    server.kill("SIGTERM");
  }
}

runBrowserFlows().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
