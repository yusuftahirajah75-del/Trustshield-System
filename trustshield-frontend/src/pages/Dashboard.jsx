import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import analysisService from "../services/analysisService";
import developerService from "../services/developerService";

const Dashboard = () => {
  const { user } = useAuth();

  const [analyses, setAnalyses] = useState([]);
  const [devStats, setDevStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newKeyPrompt, setNewKeyPrompt] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  // Key creation state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Production API Key");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState("checks"); // "checks" | "activity" | "threats" | "quickstart"

  // Revocation state
  const [revokingId, setRevokingId] = useState(null);

  const loadData = async () => {
    try {
      const [analysisRes, statsRes] = await Promise.all([
        analysisService
          .listAnalyses(1, 20)
          .catch(() => ({ data: { analyses: [] } })),
        developerService
          .getDeveloperStats()
          .catch(() => ({ data: null }))
      ]);

      setAnalyses(analysisRes?.data?.analyses || []);
      setDevStats(statsRes?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateKey = async (e) => {
    if (e) e.preventDefault();
    try {
      setError("");
      setIsGenerating(true);
      const res = await developerService.createApiKey(
        newKeyName || "TrustShield Developer Key",
        newKeyRateLimit || 60
      );
      const createdKey = res?.data?.apiKey;
      setNewKeyPrompt(createdKey?.rawKey || null);
      setSuccessMsg("API Key created successfully! Copy the secret now.");
      setShowKeyModal(false);
      setNewKeyName("Production API Key");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (id, name) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke "${name}"? Any application using this key will immediately be blocked with 401 Unauthorized.`
    );
    if (!confirmed) return;

    try {
      setRevokingId(id);
      setError("");
      await developerService.revokeApiKey(id);
      setSuccessMsg(`API key "${name}" has been permanently revoked.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke API Key.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(""), 2500);
    }
  };

  const displayName =
    user?.firstName || user?.first_name || "Security Professional";

  const totalRequests = devStats?.totalRequests ?? analyses.length;
  const successfulRequests = devStats?.successfulRequests ?? totalRequests;
  const failedRequests = devStats?.failedRequests ?? 0;
  const threatDetections =
    devStats?.threatDetections ??
    analyses.filter((a) =>
      ["high", "critical"].includes(String(a.riskLevel).toLowerCase())
    ).length;

  const riskDist = devStats?.riskDistribution || {
    low: analyses.filter((a) => String(a.riskLevel).toLowerCase() === "low")
      .length,
    medium: analyses.filter(
      (a) => String(a.riskLevel).toLowerCase() === "medium"
    ).length,
    high: analyses.filter((a) => String(a.riskLevel).toLowerCase() === "high")
      .length,
    critical: analyses.filter(
      (a) => String(a.riskLevel).toLowerCase() === "critical"
    ).length
  };

  const activeKey = devStats?.activeKey;
  const allKeys = devStats?.allKeys || [];
  const recentThreats = devStats?.recentThreats?.length
    ? devStats.recentThreats
    : analyses
        .filter((a) =>
          ["high", "critical"].includes(String(a.riskLevel).toLowerCase())
        )
        .slice(0, 8);

  const recentChecks = devStats?.recentChecks?.length
    ? devStats.recentChecks
    : analyses.slice(0, 10);

  const recentActivity = devStats?.recentActivity || [];

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <PageContainer>
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800">
                  TrustShield Developer Platform
                </span>
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  API v1 Live
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
                Welcome, {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage API credentials, inspect digital trust verifications, and track real-time threat intelligence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-slate-800 transition"
              >
                <span>+</span> Generate API Key
              </button>
              <Link to="/billing">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition">
                  <span>💳</span> Billing & Plans
                </button>
              </Link>
              <Link to="/analyze">
                <Button variant="secondary" className="!min-h-0 !py-2.5 !text-xs">
                  Run Web Check
                </Button>
              </Link>
            </div>
          </div>

          {/* Feedback & Alerts */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="text-xs font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
              <span>{successMsg}</span>
              <button
                onClick={() => setSuccessMsg("")}
                className="text-xs font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* New API Key Reveal Banner */}
          {newKeyPrompt && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                    <h3 className="text-base font-bold text-amber-950">
                      New Secret API Key Generated
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-amber-900 leading-relaxed max-w-2xl">
                    Copy and store this raw secret key immediately. For security,{" "}
                    <strong>this secret will never be displayed again</strong>.
                    Use header <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">x-api-key: {newKeyPrompt.slice(0, 12)}...</code> to authenticate requests.
                  </p>
                </div>
                <button
                  onClick={() => setNewKeyPrompt(null)}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Done
                </button>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <code className="flex-1 rounded-lg bg-white p-3 font-mono text-xs font-bold text-slate-950 border border-amber-300 select-all break-all shadow-inner">
                  {newKeyPrompt}
                </code>
                <button
                  onClick={() => handleCopy(newKeyPrompt)}
                  className="rounded-lg bg-amber-900 px-5 py-3 text-xs font-bold text-white hover:bg-amber-950 transition whitespace-nowrap shadow"
                >
                  {copyFeedback || "Copy Key to Clipboard"}
                </button>
              </div>
            </div>
          )}

          {/* Generate Key Modal Dialog */}
          {showKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-950">
                    Create Developer API Key
                  </h3>
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Key Label / Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Backend Production Server"
                      required
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Rate Limit (Requests / Minute)
                    </label>
                    <select
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value={60}>Standard Developer (60 req/min)</option>
                      <option value={120}>High-Throughput (120 req/min)</option>
                      <option value={300}>Enterprise Dedicated (300 req/min)</option>
                    </select>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
                    <p className="font-semibold">Security Notice:</p>
                    <p className="mt-0.5">
                      Your key will be securely hashed with SHA-256 before being stored in PostgreSQL. The raw secret will only be shown once.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isGenerating ? "Generating..." : "Generate Secret Key"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <Card>
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-medium animate-pulse">
                  Loading intelligence & telemetry data...
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Top Metric Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Requests
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold text-slate-950">
                      {totalRequests}
                    </p>
                    {failedRequests > 0 && (
                      <span className="text-[11px] font-semibold text-red-600">
                        ({failedRequests} err)
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{successfulRequests} successful ({devStats?.requestsToday || 0} today)</span>
                  </div>
                </Card>

                <Card>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Threat Detections
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold text-red-600">
                      {threatDetections}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Scam DNA hits
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    High & Critical risk campaigns
                  </p>
                </Card>

                <Card>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active API Credentials
                  </p>
                  <div className="mt-2">
                    {activeKey ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {activeKey.key_prefix}
                          </span>
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {activeKey.rate_limit_per_minute || 60} req/min limit
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-400">
                          No Active Key
                        </p>
                        <button
                          onClick={() => setShowKeyModal(true)}
                          className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Generate your first key
                        </button>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Usage & Quota
                    </p>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-800">
                      {devStats?.entitlements?.planName || "Free"} Plan
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-3xl font-extrabold text-slate-950">
                      {devStats?.entitlements?.percentage ?? devStats?.usage?.percentage ?? 0}%
                    </p>
                    <span className="text-xs font-medium text-slate-500">
                      {devStats?.entitlements?.used ?? totalRequests} / {devStats?.entitlements?.monthlyLimit ?? devStats?.usage?.limit ?? 500}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, devStats?.entitlements?.percentage ?? devStats?.usage?.percentage ?? 0)}%`
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      {devStats?.entitlements?.remaining ?? 500} checks remaining
                    </span>
                    <Link
                      to="/billing"
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Manage Plan →
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Developer API Key Management */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      API Credentials & Access Control
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Production API keys for integrating TrustShield into external apps, pipelines, and gateways.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="self-start sm:self-auto rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    + Create New Key
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  {allKeys.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 px-3">Key Label</th>
                          <th className="py-2.5 px-3">Prefix</th>
                          <th className="py-2.5 px-3">Rate Limit</th>
                          <th className="py-2.5 px-3">Created</th>
                          <th className="py-2.5 px-3">Last Used</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {allKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {key.name}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {key.key_prefix}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {key.rate_limit_per_minute || 60} req/min
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {new Date(key.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {key.last_used_at
                                ? new Date(key.last_used_at).toLocaleTimeString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "Never"}
                            </td>
                            <td className="py-3 px-3">
                              {key.is_active ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                  Revoked
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {key.is_active ? (
                                <button
                                  onClick={() => handleRevokeKey(key.id, key.name)}
                                  disabled={revokingId === key.id}
                                  className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  {revokingId === key.id ? "Revoking..." : "Revoke Key"}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No API credentials have been created yet. Click "Create New Key" above to get started.
                    </div>
                  )}
                </div>
              </Card>

              {/* Risk Distribution Breakdown */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Scanned Risk Distribution
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Categorization breakdown across all analyzed endpoints and URLs.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {totalRequests} assets analyzed
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Low Risk
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Safe
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-950">
                      {riskDist.low}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      {totalRequests > 0
                        ? `${Math.round((riskDist.low / totalRequests) * 100)}% of total`
                        : "0%"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Medium Risk
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Verify
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-amber-950">
                      {riskDist.medium}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-700">
                      {totalRequests > 0
                        ? `${Math.round((riskDist.medium / totalRequests) * 100)}% of total`
                        : "0%"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                        High Risk
                      </span>
                      <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                        Caution
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-orange-950">
                      {riskDist.high}
                    </p>
                    <p className="mt-1 text-[11px] text-orange-700">
                      {totalRequests > 0
                        ? `${Math.round((riskDist.high / totalRequests) * 100)}% of total`
                        : "0%"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                        Critical Threat
                      </span>
                      <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                        Scam DNA
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-red-950">
                      {riskDist.critical}
                    </p>
                    <p className="mt-1 text-[11px] text-red-700">
                      {totalRequests > 0
                        ? `${Math.round((riskDist.critical / totalRequests) * 100)}% of total`
                        : "0%"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Multi-Tab Interactive View */}
              <Card>
                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab("checks")}
                    className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === "checks"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Recent URL Checks ({recentChecks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === "activity"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Recent API Activity ({recentActivity.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("threats")}
                    className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === "threats"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Threat Detections ({recentThreats.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("quickstart")}
                    className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === "quickstart"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    API Quickstart
                  </button>
                </div>

                {/* Tab 1: Recent URL Checks */}
                {activeTab === "checks" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between pb-3">
                      <p className="text-xs text-slate-500">
                        Latest URL verifications analyzed through TrustScore & Scam DNA engines.
                      </p>
                      <Link
                        to="/history"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        View Full History →
                      </Link>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {recentChecks.length > 0 ? (
                        recentChecks.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xs font-bold text-slate-900 truncate">
                                {item.url}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    item.riskLevel === "CRITICAL"
                                      ? "bg-red-100 text-red-700"
                                      : item.riskLevel === "HIGH"
                                      ? "bg-orange-100 text-orange-700"
                                      : item.riskLevel === "MEDIUM"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {item.riskLevel}
                                </span>
                                {item.scamPattern?.name && (
                                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                                    Pattern: {item.scamPattern.name}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400">
                                  {new Date(
                                    item.createdAt || item.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Link
                                to={`/results/${item.id}`}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No checks recorded yet. Scan a URL to populate intelligence.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Recent API Activity */}
                {activeTab === "activity" && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 pb-3">
                      Real-time telemetry log of incoming API requests authenticated via developer API keys.
                    </p>

                    <div className="overflow-x-auto">
                      {recentActivity.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="py-2 px-2.5">Method</th>
                              <th className="py-2 px-2.5">Endpoint</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5">Latency</th>
                              <th className="py-2 px-2.5">Risk Flag</th>
                              <th className="py-2 px-2.5">IP Address</th>
                              <th className="py-2 px-2.5">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {recentActivity.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-2.5">
                                  <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                    {log.method || "POST"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2.5 font-mono text-slate-800 text-[11px]">
                                  {log.endpoint}
                                </td>
                                <td className="py-2.5 px-2.5">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                                      log.statusCode < 300
                                        ? "bg-emerald-100 text-emerald-800"
                                        : log.statusCode === 429
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {log.statusCode}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2.5 font-mono text-slate-600 text-[11px]">
                                  {log.responseTimeMs ? `${log.responseTimeMs}ms` : "-"}
                                </td>
                                <td className="py-2.5 px-2.5">
                                  {log.riskLevel ? (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                        log.isThreat
                                          ? "bg-red-100 text-red-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {log.riskLevel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2.5 font-mono text-[10px] text-slate-500">
                                  {log.ipAddress || "127.0.0.1"}
                                </td>
                                <td className="py-2.5 px-2.5 text-[11px] text-slate-500">
                                  {new Date(log.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No programmatic API calls recorded yet. Send a request with your API key to view live telemetry.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Threat Detections */}
                {activeTab === "threats" && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 pb-3">
                      High-severity threats matching deterministic Scam DNA campaigns and impersonation signatures.
                    </p>

                    <div className="divide-y divide-slate-100">
                      {recentThreats.length > 0 ? (
                        recentThreats.map((threat) => (
                          <div
                            key={threat.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xs font-bold text-red-700 truncate">
                                {threat.url}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                                  {threat.riskLevel}
                                </span>
                                {threat.scamPattern?.name && (
                                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-900">
                                    DNA: {threat.scamPattern.name}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400">
                                  {new Date(
                                    threat.createdAt || threat.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <Link
                              to={`/results/${threat.id}`}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition whitespace-nowrap"
                            >
                              Inspect Scam DNA
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Zero critical threats detected in your workspace. All systems clean.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: API Quickstart */}
                {activeTab === "quickstart" && (
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-500">
                      Integrate TrustShield URL verification and threat reporting into your applications.
                    </p>

                    {(() => {
                      const apiBase = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "https://api.trustshield.io");
                      const sampleKey = activeKey?.key_prefix || "ts_live_your_key_here";
                      return (
                        <>
                          <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                              1. Scan URL via cURL
                            </p>
                            <div className="relative">
                              <pre className="rounded-lg bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto">
{`curl -X POST ${apiBase}/api/v1/trust/check \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${sampleKey}" \\
  -d '{"url": "https://example.com"}'`}
                              </pre>
                              <button
                                onClick={() =>
                                  handleCopy(
                                    `curl -X POST ${apiBase}/api/v1/trust/check \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${sampleKey}" \\\n  -d '{"url": "https://example.com"}'`
                                  )
                                }
                                className="absolute top-2 right-2 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                              2. Fetch Stored Analysis via Node.js
                            </p>
                            <pre className="rounded-lg bg-slate-950 p-3.5 font-mono text-xs text-sky-300 overflow-x-auto">
{`const res = await fetch("${apiBase}/api/v1/trust/<ANALYSIS_ID>", {
  headers: {
    "x-api-key": "${sampleKey}"
  }
});
const data = await res.json();
console.log("TrustScore:", data.data.trustScore);
console.log("Risk Level:", data.data.riskLevel);
console.log("Scam DNA:", data.data.scamDNA);`}
                            </pre>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </PageContainer>
    </main>
  );
};

export default Dashboard;