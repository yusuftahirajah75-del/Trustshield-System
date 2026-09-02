import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import billingService from "../services/billingService";

const Billing = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [checkoutLoadingSlug, setCheckoutLoadingSlug] = useState(null);

  // Verification state from redirect
  const [paymentResult, setPaymentResult] = useState(null); // null | { status: 'success' | 'failed', message: string, details?: any }
  const [isVerifying, setIsVerifying] = useState(false);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadBillingData = async () => {
    try {
      setError("");
      const [plansRes, subRes] = await Promise.all([
        billingService.getPlans().catch(() => ({ data: { plans: [] } })),
        billingService.getSubscription().catch(() => ({ data: null }))
      ]);

      setPlans(plansRes?.data?.plans || []);
      setSubData(subRes?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load billing details."
      );
    } finally {
      setLoading(false);
    }
  };

  // Inspect return redirect parameters from Paystack
  useEffect(() => {
    let isMounted = true;

    const checkPaymentAndLoad = async () => {
      const reference = searchParams.get("reference");
      const statusParam = searchParams.get("status");

      if (reference) {
        setIsVerifying(true);
        try {
          const res = await billingService.verifyPayment(reference);
          if (!isMounted) return;

          if (res?.data?.status === "success" || statusParam === "success") {
            setPaymentResult({
              status: "success",
              reference,
              amount: res?.data?.amount || 19,
              currency: res?.data?.currency || "USD",
              entitlements: res?.data?.entitlements
            });
            setSuccessMsg("Payment verified successfully! Your account has been upgraded.");
          } else {
            setPaymentResult({
              status: "failed",
              reference,
              message: "Payment could not be verified or was cancelled."
            });
          }
        } catch (err) {
          if (!isMounted) return;
          setPaymentResult({
            status: "failed",
            reference,
            message:
              err.response?.data?.message ||
              "Transaction verification failed. Please check your bank or contact support."
          });
        } finally {
          if (isMounted) {
            setIsVerifying(false);
            setSearchParams({}, { replace: true });
            await loadBillingData();
          }
        }
      } else {
        await loadBillingData();
      }
    };

    checkPaymentAndLoad();

    return () => {
      isMounted = false;
    };
  }, [searchParams, setSearchParams]);

  const handleCheckout = async (planSlug) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setError("");
      setCheckoutLoadingSlug(planSlug);

      const callbackUrl = `${window.location.origin}/billing`;
      const res = await billingService.initializeCheckout(planSlug, callbackUrl);

      if (res?.data?.isFree) {
        setSuccessMsg("Switched to Free plan successfully.");
        await loadBillingData();
        return;
      }

      if (res?.data?.authorizationUrl) {
        // Redirect to Paystack secure checkout via assign
        window.location.assign(res.data.authorizationUrl);
      } else {
        setError("Unable to initiate payment session. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate checkout. Please try again."
      );
    } finally {
      setCheckoutLoadingSlug(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      setError("");
      await billingService.cancelSubscription();
      setSuccessMsg(
        "Your subscription has been scheduled for cancellation. You will retain access until the end of the billing period."
      );
      setShowCancelModal(false);
      await loadBillingData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to cancel subscription."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const entitlements = subData?.entitlements || {
    plan: "free",
    planName: "Free",
    monthlyLimit: 500,
    used: 0,
    remaining: 500,
    percentage: 0,
    rateLimitPerMinute: 60,
    status: "active"
  };

  const activePlanSlug = entitlements.plan?.toLowerCase() || "free";
  const payments = subData?.paymentHistory || [];
  const currentSub = subData?.subscription;

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <PageContainer>
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Top Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800">
                  Subscription & Billing
                </span>
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Paystack Gateway Active
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
                Plans & Quota Management
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose the amount of digital trust your application needs. Scale checks seamlessly as your product grows.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard">
                <Button variant="secondary" className="!min-h-0 !py-2.5 !text-xs">
                  ← Back to Dashboard
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

          {/* Payment Verification Banner / State */}
          {isVerifying && (
            <Card className="border-blue-300 bg-blue-50/50 text-center py-8">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Verifying your payment with Paystack...
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Please do not close this window. We are confirming your transaction.
                </p>
              </div>
            </Card>
          )}

          {/* Payment Success State */}
          {paymentResult?.status === "success" && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-base shadow">
                      ✓
                    </span>
                    <h2 className="text-2xl font-extrabold text-emerald-950">
                      Payment Successful
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Welcome to TrustShield {paymentResult.entitlements?.planName || "Upgraded Tier"}.
                  </p>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-xl">
                    Your account has been upgraded. You now have{" "}
                    <strong>
                      {(paymentResult.entitlements?.monthlyLimit || 5000).toLocaleString()} trust checks/month
                    </strong>{" "}
                    and higher rate limits. You can now integrate TrustShield into your application and start processing real traffic.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700">
                    Reference: {paymentResult.reference}
                  </p>
                </div>

                <div className="flex flex-wrap md:flex-col gap-3 w-full md:w-auto">
                  <Link to="/dashboard">
                    <button className="w-full rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow">
                      Go to Dashboard
                    </button>
                  </Link>
                  <Link to="/dashboard">
                    <button className="w-full rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 transition">
                      View API Credentials
                    </button>
                  </Link>
                  <button
                    onClick={() => setPaymentResult(null)}
                    className="w-full text-center text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Dismiss Notice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Failure State */}
          {paymentResult?.status === "failed" && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white font-bold text-base shadow">
                      ✕
                    </span>
                    <h2 className="text-2xl font-extrabold text-red-950">
                      Payment Not Completed
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-red-900">
                    Your transaction was not completed or failed verification.
                  </p>
                  <p className="text-xs text-red-800 leading-relaxed max-w-xl">
                    {paymentResult.message || "Your current plan has not changed. No charges were captured."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentResult(null)}
                    className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition shadow"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Billing Content */}
          {loading ? (
            <Card>
              <div className="py-16 text-center text-slate-500">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="mt-4 text-sm font-medium">
                  Loading plan entitlements & billing records...
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Active Subscription Summary Card */}
              <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Current Subscription Status
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold text-slate-950">
                    {entitlements.planName} Plan
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      entitlements.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : entitlements.status === "past_due"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {entitlements.status}
                  </span>
                  {entitlements.cancelAtPeriodEnd && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                      Cancels at end of period
                    </span>
                  )}
                </div>
              </div>

              {currentSub && activePlanSlug !== "free" && !entitlements.cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition self-start sm:self-auto"
                >
                  Cancel Renewal
                </button>
              )}
            </div>

            {/* Quota Progress Bar */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Monthly Request Allowance</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-1">
                  {entitlements.used.toLocaleString()} / {entitlements.monthlyLimit.toLocaleString()}
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      entitlements.percentage > 90 ? "bg-red-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${entitlements.percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {entitlements.percentage}% quota utilized
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-semibold">Checks Remaining</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-1">
                  {entitlements.remaining.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {entitlements.rateLimitPerMinute} requests/minute rate limit
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-semibold">Billing Cycle & Renewal</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {entitlements.renewalDate
                    ? new Date(entitlements.renewalDate).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })
                    : "Calendar Month Reset"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {activePlanSlug === "free" ? "Free tier renewals monthly" : "Auto-renews monthly"}
                </p>
              </div>
            </div>
          </Card>

          {/* Pricing Tier Grid */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Compare Plans & Upgrade
              </h2>
              <p className="text-xs text-slate-500">
                Transparent pricing. Upgrade or downgrade anytime with instant entitlement updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isCurrent = activePlanSlug === plan.slug.toLowerCase();
                const isPopular = plan.slug === "starter" || plan.slug === "growth";
                const isCheckingOut = checkoutLoadingSlug === plan.slug;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                      isCurrent
                        ? "border-blue-600 ring-2 ring-blue-600/20"
                        : isPopular
                        ? "border-slate-300"
                        : "border-slate-200"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 right-6 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-950">
                          {plan.name}
                        </h3>
                        {isCurrent && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-700">
                            Current Plan
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-600 min-h-[36px]">
                        {plan.description}
                      </p>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-950">
                          ${Number(plan.price).toFixed(0)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / month
                        </span>
                      </div>

                      <div className="mt-2 border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-blue-600">
                          {plan.monthly_request_limit.toLocaleString()} trust checks/mo
                        </span>
                      </div>

                      <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                        {Array.isArray(plan.features) &&
                          plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full rounded-lg bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-default"
                        >
                          Active Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckout(plan.slug)}
                          disabled={isCheckingOut}
                          className={`w-full rounded-lg py-2.5 text-xs font-bold transition shadow-sm ${
                            plan.slug === "starter"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : plan.slug === "growth"
                              ? "bg-slate-950 text-white hover:bg-slate-800"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          } disabled:opacity-50`}
                        >
                          {isCheckingOut
                            ? "Connecting to Paystack..."
                            : Number(plan.price) === 0
                            ? "Switch to Free"
                            : `Upgrade to ${plan.name}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment History Card */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  Payment History & Invoices
                </h3>
                <p className="text-xs text-slate-500">
                  Real provider transaction receipts processed through Paystack.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              {payments.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(tx.createdAt || tx.paidAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                          {tx.reference}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {tx.planName}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-950">
                          ${tx.amount.toFixed(2)} {tx.currency}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              tx.status === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : tx.status === "failed"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                tx.status === "success"
                                  ? "bg-emerald-500"
                                  : tx.status === "failed"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {tx.status === "success" ? "Paid" : tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No payment history recorded yet. Transactions will appear here once an upgrade is completed.
                </div>
              )}
            </div>
          </Card>
          </>
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-950">
                Cancel Subscription Renewal
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel your renewal? Your plan and higher API limits will remain active until the end of your current billing period (
                <strong>
                  {entitlements.renewalDate
                    ? new Date(entitlements.renewalDate).toLocaleDateString()
                    : "end of month"}
                </strong>
                ). You will not be billed again.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </main>
  );
};

export default Billing;
