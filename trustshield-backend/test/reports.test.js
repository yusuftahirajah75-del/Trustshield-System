const { test, describe, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, query } = require("../src/config/database");
const {
  submitScamReport,
  getReport,
  listUserReports
} = require("../src/services/reportService");

describe("Scam Report Intelligence Submission Flow", () => {
  const createdReportIds = [];

  after(async () => {
    for (const id of createdReportIds) {
      await query("DELETE FROM scam_reports WHERE id = $1", [id]).catch(() => {});
    }
    await pool.end();
  });

  test("submits scam report and associates intelligence with active campaign", async () => {
    const reportData = {
      url: "https://zenith-account-verify.click/login",
      category: "phishing",
      description:
        "Fraudulent Zenith Bank portal asking for account verification, login password, and ATM PIN.",
      evidence: ["CREDENTIAL_REQUEST", "PIN_REQUEST"]
    };

    const result = await submitScamReport(reportData);
    assert.ok(result.id);
    createdReportIds.push(result.id);

    assert.strictEqual(result.url, reportData.url);
    assert.strictEqual(result.category, reportData.category);
    assert.strictEqual(result.status, "submitted");

    // Check campaign linkage
    assert.ok(result.associatedPattern);
    assert.ok(
      result.associatedPattern.name === "Banking Impersonation" ||
      result.associatedPattern.name === "OTP or PIN Credential Theft"
    );
    assert.ok(result.extractedSignals.includes("BANKING_CLAIM"));
    assert.ok(result.extractedSignals.includes("CREDENTIAL_REQUEST"));
  });

  test("retrieves submitted report details", async () => {
    const reportId = createdReportIds[0];
    const report = await getReport(reportId);

    assert.ok(report);
    assert.strictEqual(report.id, reportId);
    assert.ok(
      report.pattern_name === "Banking Impersonation" ||
      report.pattern_name === "OTP or PIN Credential Theft"
    );
  });

  test("lists submitted reports", async () => {
    const reports = await listUserReports({ limit: 10, offset: 0 });
    assert.ok(Array.isArray(reports));
    assert.ok(reports.length >= 1);
  });
});
