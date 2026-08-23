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
        const response =
          await analysisService.getAnalysis(id);

        setAnalysis(
          response?.data?.analysis || null
        );
      } catch (error) {
        setError(
          error.response?.data?.message ||
          error.message ||
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
            <p className="text-slate-600">
              Loading analysis result...
            </p>
          </Card>
        </PageContainer>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 py-12">
        <PageContainer>
          <Card>
            <h1 className="text-2xl font-bold text-slate-950">
              Analysis unavailable
            </h1>

            <p className="mt-3 text-red-600">
              {error}
            </p>

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

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              TrustShield Analysis
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Analysis Result
            </h1>

            <p className="mt-4 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm text-slate-700">
              {analysis.url}
            </p>
          </Card>

          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">
                  Risk score
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-950">
                  {analysis.riskScore}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Risk level
                </p>

                <p className="mt-1 text-3xl font-bold capitalize text-slate-950">
                  {analysis.riskLevel}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-950">
              Assessment
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              {analysis.summary}
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-950">
              Warning indicators
            </h2>

            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
              {JSON.stringify(
                analysis.indicators,
                null,
                2
              )}
            </pre>
          </Card>

          <div>
            <Link
              to="/analyze"
              className="inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Analyze another URL
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
};

export default Results;
