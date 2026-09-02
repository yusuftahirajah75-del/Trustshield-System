import api from "../api/axios";

const ANALYSIS_BASE = "/api/v1/analysis";

const createAnalysis = async (url) => {
  const response = await api.post(
    `${ANALYSIS_BASE}/`,
    { url }
  );

  return response.data;
};

const listAnalyses = async (page = 1, limit = 20) => {
  const response = await api.get(
    `${ANALYSIS_BASE}/`,
    {
      params: {
        page,
        limit,
      },
    }
  );

  return response.data;
};

const getAnalysis = async (id) => {
  const response = await api.get(
    `${ANALYSIS_BASE}/${id}`
  );

  return response.data;
};

const deleteAnalysis = async (id) => {
  const response = await api.delete(
    `${ANALYSIS_BASE}/${id}`
  );

  return response.data;
};

const analysisService = {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
};

export default analysisService;