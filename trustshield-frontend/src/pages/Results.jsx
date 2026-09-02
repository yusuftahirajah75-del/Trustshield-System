import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import analysisService from "../services/analysisService";

const Results = () => {
  const { id } = useParams();

  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const response = await analysisService.getAnalysis(id);
        setAnalysis(response?.data?.analysis || null);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to retrieve analysis."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-12">
        <PageContainer>
          <Card>
            <p className="text-slate-600">Loading analysis result...</p>
          </Card>
        </PageContainer>
      </main>
    );
  }

  if (error || !analysis) {
    return (
      <main className="min-h-screen bg-slate-50 py-12">
        <PageContainer>
          <Card>
            <h1 className="text-2xl font-bold text-slate-950">
              Analysis unavailable
            </h1>
            <p className="mt-3 text-red-600">{error || "Analysis not found."}</p>
            <Link
              to="/analyze"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Analyze another URL
            </Link>
          </Card>
        </PageContainer>
      </main>
    );
  }

  const scamPattern = analysis.scamPattern;
  const isPatternMatched = scamPattern && scamPattern.matched;

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <Card>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              TrustShield Threat Intelligence
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
              URL Analysis Report
            </h1>
            <p className="mt-4 break-all rounded-lg bg-slate-950 p-4 font-mono text-sm text-emerald-400">
              {analysis.url}
            </p>
          </Card>

          {/* Scam DNA Pattern Match Banner */}
          {isPatternMatched && (
            <div className="rounded-xl border-2 border-purple-500 bg-purple-50/70 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Recurring Scam DNA Campaign Detected
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-bold text-purple-950">
                {scamPattern.name}
              </h2>

              <p className="mt-1 text-sm text-purple-800">
                This URL exhibits signature signals belonging to a known, recurring scam campaign.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-white p-4 border border-purple-200">
                <div>
                  <p className="text-xs text-slate-500">DNA Match Confidence</p>
                  <p className="mt-1 text-2xl font-extrabold text-purple-900">
                    {Math.round((scamPattern.confidence || 0) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Intelligence Rule</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Required Signals Satisfied
                  </p>
                </div>
              </div>

              {scamPattern.signals?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-purple-900">
                    Matched Signal Fingerprint:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {scamPattern.signals.map((sig, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-purple-200 px-2.5 py-1 font-mono text-xs font-semibold text-purple-950"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scores Overview */}
          <Card>
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  TrustScore
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-950">
                  {analysis.trustScore ?? Math.max(0, 100 - (analysis.riskScore || 0))}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Risk Score
                </p>
                <p className="mt-1 text-3xl font-extrabold text-red-600">
                  {analysis.riskScore}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Risk Classification
                </p>
                <p className="mt-1 text-2xl font-bold uppercase text-red-700">
                  {analysis.riskLevel}
                </p>
              </div>
            </div>
          </Card>

          {/* Assessment */}
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Security Assessment</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {analysis.summary}
            </p>
          </Card>

          {/* Indicators & Heuristic Evidence */}
          <Card>
            <h2 className="text-lg font-bold text-slate-950">
              Detected Indicators & Signals
            </h2>
            <div className="mt-4 space-y-3">
              {Array.isArray(analysis.indicators) && analysis.indicators.length > 0 ? (
                analysis.indicators.map((ind, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {ind.code}
                      </span>
                      {ind.severity && (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {ind.severity}
                        </span>
                      )}
                    </div>
                    {ind.title && (
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {ind.title}
                      </p>
                    )}
                    {ind.description && (
                      <p className="mt-1 text-xs text-slate-600">
                        {ind.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No warning indicators detected.</p>
              )}
            </div>
          </Card>

          {/* Navigation action */}
          <div className="flex gap-4">
            <Link
              to="/analyze"
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Analyze Another URL
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
};

export default Results;
