import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type AdminSession } from "./api";

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  session: AdminSession | null;
  pendingCount: number;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.session();
      if (res.authenticated && res.session) {
        setSession(res.session);
        setPendingCount(res.pendingCount || 0);
        setStatus("authenticated");
      } else {
        setSession(null);
        setStatus("unauthenticated");
      }
    } catch {
      // Network failure talking to the backend -- treat as unauthenticated rather than stuck loading.
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const res = await authApi.login(username, password);
      if (res.authenticated && res.session) {
        setSession(res.session);
        setStatus("authenticated");
      } else {
        throw new Error("invalid-admin-login");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "login failed";
      setError(message === "invalid-admin-login" ? "Invalid username or password." : message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, session, pendingCount, error, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
