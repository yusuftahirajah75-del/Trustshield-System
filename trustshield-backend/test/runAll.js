const { pool } = require("../src/config/database");

async function runTests() {
  console.log("🛡️ Running TrustShield Test Suite...\n");

  const testFiles = [
    "./signalExtraction.test.js",
    "./scamDnaMatching.test.js",
    "./regression.test.js",
    "./patternPersistence.test.js",
    "./trustCheck.test.js",
    "./reports.test.js",
    "./apiKeyFoundation.test.js",
    "./trustApiEndpoints.test.js",
    "./billingFoundation.test.js",
    "./e2eBillingLifecycle.test.js"
  ];

  for (const file of testFiles) {
    console.log(`\n========================================`);
    console.log(`▶ Running ${file}...`);
    console.log(`========================================`);
    try {
      require(file);
    } catch (err) {
      console.error(`❌ Failed loading ${file}:`, err);
      process.exitCode = 1;
    }
  }
}

runTests();
