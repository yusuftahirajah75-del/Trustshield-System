import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import analysisService from "../services/analysisService";

const Analyzer = () => {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a URL.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response =
        await analysisService.createAnalysis(
          trimmedUrl
        );

      const analysis =
        response?.data?.analysis;

      if (!analysis?.id) {
        throw new Error(
          "Analysis completed but no result ID was returned."
        );
      }

      navigate(`/results/${analysis.id}`);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to analyze this URL.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <Card>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                TrustShield
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Analyze a URL
              </h1>

              <p className="mt-3 text-slate-600">
                Enter a website URL and TrustShield will assess
                available warning indicators.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-4"
            >
              <div>
                <label
                  htmlFor="url"
                  className="mb-2 block text-sm font-medium text-slate-900"
                >
                  Website URL
                </label>

                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(event) =>
                    setUrl(event.target.value)
                  }
                  placeholder="https://example.com"
                  autoComplete="url"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Analyzing..."
                  : "Analyze URL"}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-500">
              TrustShield provides security information and
              does not guarantee that a website is safe.
            </p>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
};

export default Analyzer;
