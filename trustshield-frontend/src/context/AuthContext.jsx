import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import authService from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  const restoreSession = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();

      if (response?.success && response?.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener(
      "trustshield:unauthorized",
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        "trustshield:unauthorized",
        handleUnauthorized
      );
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);

    if (!response?.success || !response?.data?.user) {
      throw new Error(
        response?.message || "Unable to complete login."
      );
    }

    setUser(response.data.user);

    return response;
  }, []);

  const register = useCallback(async (registrationData) => {
    const response = await authService.register(
      registrationData
    );

    if (!response?.success || !response?.data?.user) {
      throw new Error(
        response?.message ||
          "Unable to complete registration."
      );
    }

    setUser(response.data.user);

    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      restoreSession,
    }),
    [
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      restoreSession,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
};

export default AuthContext;