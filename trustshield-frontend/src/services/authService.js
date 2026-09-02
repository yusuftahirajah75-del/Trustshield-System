import api from "../api/axios";

const AUTH_BASE = "/api/v1/auth";

const register = async (payload) => {
  const response = await api.post(
    `${AUTH_BASE}/register`,
    payload
  );

  return response.data;
};

const login = async (payload) => {
  const response = await api.post(
    `${AUTH_BASE}/login`,
    payload
  );

  return response.data;
};

const getCurrentUser = async () => {
  const response = await api.get(`${AUTH_BASE}/me`);

  return response.data;
};

const logout = async () => {
  const response = await api.post(`${AUTH_BASE}/logout`);

  return response.data;
};

const authService = {
  register,
  login,
  getCurrentUser,
  logout,
};

export default authService;