
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import analysisService from "../services/analysisService";

const History = () => {
  const [analyses, setAnalyses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response =
          await analysisService.listAnalyses(1, 20);

        setAnalyses(
          response?.data?.analyses || []
        );

        setPagination(
          response?.data?.pagination || null
        );
      } catch (error) {
        setError(
          error.response?.data?.message ||
          error.message ||
          "Unable to load analysis history."
        );
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              TrustShield
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Analysis History
            </h1>

            <p className="mt-2 text-slate-600">
              Review URLs you have previously analyzed.
            </p>
          </div>

          {loading && (
            <Card>
              <p className="text-slate-600">
                Loading your analysis history...
              </p>
            </Card>
          )}

          {error && !loading && (
            <Card>
              <div
                role="alert"
                className="text-red-600"
              >
                {error}
              </div>
            </Card>
          )}

          {!loading &&
            !error &&
            analyses.length === 0 && (
              <Card>
                <h2 className="text-xl font-bold text-slate-950">
                  No analyses yet
                </h2>

                <p className="mt-2 text-slate-600">
                  Analyze your first URL to begin building
                  your TrustShield history.
                </p>

                <Link
                  to="/analyze"
                  className="mt-5 inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Analyze a URL
                </Link>
              </Card>
            )}

          {!loading &&
            !error &&
            analyses.length > 0 && (
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <Card key={analysis.id}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-slate-950">
                          {analysis.url}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {new Date(
                            analysis.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Risk
                          </p>

                          <p className="font-semibold capitalize text-slate-950">
                            {analysis.riskLevel}
                          </p>
                        </div>

                        <Link
                          to={`/results/${analysis.id}`}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}

                {pagination && (
                  <p className="text-sm text-slate-500">
                    Showing page {pagination.page} of{" "}
                    {pagination.totalPages} ·{" "}
                    {pagination.total} total analysis
                    {pagination.total === 1 ? "" : "es"}
                  </p>
                )}
              </div>
            )}
        </div>
      </PageContainer>
    </main>
  );
};

export default History;
