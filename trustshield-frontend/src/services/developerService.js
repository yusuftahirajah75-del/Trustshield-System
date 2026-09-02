import api from "../api/axios";

const getDeveloperStats = async () => {
  const response = await api.get("/api/v1/developer/stats");
  return response.data;
};

const listApiKeys = async () => {
  const response = await api.get("/api/v1/developer/keys");
  return response.data;
};

const createApiKey = async (name = "Developer Key", rateLimitPerMinute = 60) => {
  const response = await api.post("/api/v1/developer/keys", {
    name,
    rateLimitPerMinute
  });
  return response.data;
};

const revokeApiKey = async (id) => {
  const response = await api.delete(`/api/v1/developer/keys/${id}`);
  return response.data;
};

export default {
  getDeveloperStats,
  listApiKeys,
  createApiKey,
  revokeApiKey
};
