import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { brandingApi } from "../api/client";
import { applyFavicon } from "../utils/applyFavicon";
import defaultPlatformLogo from "../../assets/brand-logo.png";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type BrandingContextValue = {
  platformLogoUrl: string;
  loginLogoUrl: string;
  hasCustomPlatformLogo: boolean;
  hasCustomLoginLogo: boolean;
  loading: boolean;
  refreshBranding: () => Promise<void>;
  applyLogoPayload: (payload: {
    platform_logo_url: string;
    login_logo_url: string;
    has_custom_platform_logo: boolean;
    has_custom_login_logo: boolean;
    favicon_url?: string;
  }) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function absoluteUrl(path: string | undefined | null, fallback: string) {
  if (!path) return fallback;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `${API_BASE}${path}`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [platformLogoUrl, setPlatformLogoUrl] = useState(defaultPlatformLogo);
  const [loginLogoUrl, setLoginLogoUrl] = useState(defaultPlatformLogo);
  const [hasCustomPlatformLogo, setHasCustomPlatformLogo] = useState(false);
  const [hasCustomLoginLogo, setHasCustomLoginLogo] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyLogoPayload = useCallback((payload: {
    platform_logo_url: string;
    login_logo_url: string;
    has_custom_platform_logo: boolean;
    has_custom_login_logo: boolean;
    favicon_url?: string;
  }) => {
    setPlatformLogoUrl(absoluteUrl(payload.platform_logo_url, defaultPlatformLogo));
    setLoginLogoUrl(absoluteUrl(payload.login_logo_url, defaultPlatformLogo));
    setHasCustomPlatformLogo(Boolean(payload.has_custom_platform_logo));
    setHasCustomLoginLogo(Boolean(payload.has_custom_login_logo));
    if (payload.favicon_url) {
      applyFavicon(absoluteUrl(payload.favicon_url, "/favicon.png"));
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await brandingApi.get();
      applyLogoPayload(payload);
    } catch {
      // Keep bundled defaults when branding API is unavailable.
    } finally {
      setLoading(false);
    }
  }, [applyLogoPayload]);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  const value = useMemo(
    () => ({
      platformLogoUrl,
      loginLogoUrl,
      hasCustomPlatformLogo,
      hasCustomLoginLogo,
      loading,
      refreshBranding,
      applyLogoPayload,
    }),
    [
      platformLogoUrl,
      loginLogoUrl,
      hasCustomPlatformLogo,
      hasCustomLoginLogo,
      loading,
      refreshBranding,
      applyLogoPayload,
    ],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return ctx;
}

/** Safe for BrandMark when provider might not wrap (tests / isolated renders). */
export function useBrandingOptional(): BrandingContextValue | null {
  return useContext(BrandingContext);
}
