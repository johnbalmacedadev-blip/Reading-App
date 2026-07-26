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
import { persistLang } from "../i18n/session";
import type { Lang } from "../i18n/lang";
import {
  clearTeacherLoginAlertPending,
  markTeacherLoginAlertPending,
} from "../utils/teacherLoginAlert";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  avatarVersion: number;
  login: (email: string, password: string, portal?: "teacher" | "school" | "admin" | "board") => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyUserLanguage(user: AuthUser | null) {
  const preferred = user?.preferred_language;
  if (preferred === "en" || preferred === "fr") {
    persistLang(preferred as Lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = preferred;
    }
    window.dispatchEvent(new CustomEvent("lecture-lang-change", { detail: preferred }));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const refreshUser = useCallback(async () => {
    const { user: currentUser } = await authApi.user();
    setUser(currentUser);
    applyUserLanguage(currentUser);
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
    applyUserLanguage(loggedInUser);
    setAvatarVersion(Date.now());
    if (loggedInUser.role === "teacher") {
      markTeacherLoginAlertPending(loggedInUser.id);
    }
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    const previousId = user?.id;
    const previousRole = user?.role;
    await authApi.csrf();
    await authApi.logout();
    if (previousRole === "teacher") {
      clearTeacherLoginAlertPending(previousId);
    }
    setUser(null);
  }, [user?.id, user?.role]);

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
