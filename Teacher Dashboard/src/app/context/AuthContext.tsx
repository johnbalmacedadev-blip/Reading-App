import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthUser } from "../api/client";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  avatarVersion: number;
  login: (email: string, password: string, portal?: "teacher" | "school" | "admin" | "board") => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const refreshUser = useCallback(async () => {
    const { user: currentUser } = await authApi.user();
    setUser(currentUser);
    setAvatarVersion(Date.now());
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, portal?: "teacher" | "school" | "admin" | "board") => {
    await authApi.csrf();
    const { user: loggedInUser } = await authApi.login(email, password, portal);
    setUser(loggedInUser);
    setAvatarVersion(Date.now());
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.csrf();
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, avatarVersion, login, logout, refreshUser }),
    [user, loading, avatarVersion, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
