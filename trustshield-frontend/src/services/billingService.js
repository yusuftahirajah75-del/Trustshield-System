import api from "../api/axios";

const getPlans = async () => {
  const response = await api.get("/api/v1/billing/plans");
  return response.data;
};

const getSubscription = async () => {
  const response = await api.get("/api/v1/billing/subscription");
  return response.data;
};

const initializeCheckout = async (planSlug, callbackUrl) => {
  const response = await api.post("/api/v1/billing/checkout", {
    planSlug,
    callbackUrl
  });
  return response.data;
};

const verifyPayment = async (reference) => {
  const response = await api.get(`/api/v1/billing/verify/${encodeURIComponent(reference)}`);
  return response.data;
};

const cancelSubscription = async () => {
  const response = await api.post("/api/v1/billing/subscription/cancel");
  return response.data;
};

export default {
  getPlans,
  getSubscription,
  initializeCheckout,
  verifyPayment,
  cancelSubscription
};
