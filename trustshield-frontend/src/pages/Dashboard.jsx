import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import analysisService from "../services/analysisService";

const Dashboard = () => {
  const { user } = useAuth();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response =
          await analysisService.listAnalyses(1, 20);

        setAnalyses(
          response?.data?.analyses || []
        );
      } catch (error) {
        setError(
          error.response?.data?.message ||
            error.message ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const analysisCount = analyses.length;

  const highRiskCount = analyses.filter(
    (analysis) =>
      String(analysis.riskLevel).toLowerCase() ===
      "high"
  ).length;

  const recentAnalysis = analyses[0];

  const displayName =
    user?.firstName ||
    user?.first_name ||
    "User";

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              TrustShield
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Welcome, {displayName}
            </h1>

            <p className="mt-2 text-slate-600">
              Your TrustShield security overview.
            </p>
          </div>

          {/* Error */}
          {error && (
            <Card>
              <p
                role="alert"
                className="text-red-600"
              >
                {error}
              </p>
            </Card>
          )}

          {/* Loading */}
          {loading && !error && (
            <Card>
              <p className="text-slate-600">
                Loading your dashboard...
              </p>
            </Card>
          )}

          {!loading && !error && (
            <>
              {/* Stats */}
              <div className="grid gap-5 sm:grid-cols-2">

                <Card>
                  <p className="text-sm font-medium text-slate-500">
                    Analyses
                  </p>

                  <p className="mt-2 text-4xl font-bold text-slate-950">
                    {analysisCount}
                  </p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-slate-500">
                    High Risk
                  </p>

                  <p className="mt-2 text-4xl font-bold text-slate-950">
                    {highRiskCount}
                  </p>
                </Card>

              </div>

              {/* Recent Analysis */}
              <Card className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">
                      Recent Analysis
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your latest URL assessment.
                    </p>
                  </div>

                  <Link
                    to="/history"
                    className="text-sm font-semibold text-slate-900 underline"
                  >
                    View history
                  </Link>
                </div>

                {recentAnalysis ? (
                  <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-slate-950">
                        {recentAnalysis.url}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Score: {recentAnalysis.riskScore}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-semibold uppercase text-slate-900">
                        {recentAnalysis.riskLevel}
                      </span>

                      <Link
                        to={`/results/${recentAnalysis.id}`}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6">
                    <p className="font-medium text-slate-950">
                      No analyses yet.
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      Analyze your first URL to begin.
                    </p>
                  </div>
                )}
              </Card>

              {/* Primary Action */}
              <div className="mt-6">
                <Link to="/analyze">
                  <Button>
                    Analyze a URL
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </main>
  );
};

export default Dashboard;