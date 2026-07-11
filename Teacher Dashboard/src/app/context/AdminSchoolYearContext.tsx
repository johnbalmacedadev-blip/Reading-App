import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminSchoolYearsApi, type SchoolYearRecord } from "../api/client";

const STORAGE_KEY = "admin-selected-school-year";

type AdminSchoolYearContextValue = {
  years: SchoolYearRecord[];
  defaultLabel: string;
  selectedYear: string;
  setSelectedYear: (label: string) => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  addYear: (label: string, isDefault?: boolean) => Promise<void>;
  makeDefault: (id: number) => Promise<void>;
};

const AdminSchoolYearContext = createContext<AdminSchoolYearContextValue | null>(null);

function suggestNextYearLabel(years: SchoolYearRecord[]): string {
  if (years.length === 0) {
    const now = new Date();
    const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${start + 1}`;
  }

  const latest = [...years].sort((a, b) => b.label.localeCompare(a.label))[0]?.label;
  if (latest && /^\d{4}-\d{4}$/.test(latest)) {
    const start = parseInt(latest.slice(0, 4), 10) + 1;
    return `${start}-${start + 1}`;
  }

  return "";
}

function resolveSelectedYear(
  available: SchoolYearRecord[],
  defaultLabel: string,
  current?: string
): string {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  const candidates = [current, stored, defaultLabel].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (available.some((y) => y.label === candidate)) {
      return candidate;
    }
  }

  return defaultLabel || available[0]?.label || "";
}

export function AdminSchoolYearProvider({ children }: { children: ReactNode }) {
  const [years, setYears] = useState<SchoolYearRecord[]>([]);
  const [defaultLabel, setDefaultLabel] = useState("");
  const [selectedYear, setSelectedYearState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminSchoolYearsApi.list();
      setYears(data.school_years);
      setDefaultLabel(data.default_label);
      setSelectedYearState((current) => {
        const resolved = resolveSelectedYear(data.school_years, data.default_label, current);
        if (resolved) {
          sessionStorage.setItem(STORAGE_KEY, resolved);
        }
        return resolved;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load school years.");
      setYears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedYear = useCallback((label: string) => {
    setSelectedYearState(label);
    sessionStorage.setItem(STORAGE_KEY, label);
  }, []);

  const addYear = useCallback(async (label: string, isDefault = false) => {
    const result = await adminSchoolYearsApi.create({ label, is_default: isDefault });
    setYears((prev) => {
      const next = [...prev.filter((y) => y.id !== result.school_year.id), result.school_year];
      return next.sort((a, b) => b.label.localeCompare(a.label));
    });
    setDefaultLabel(result.default_label);
    setSelectedYear(result.school_year.label);
    if (isDefault || result.school_year.is_default) {
      setYears((prev) =>
        prev.map((y) => ({ ...y, is_default: y.id === result.school_year.id }))
      );
    }
  }, [setSelectedYear]);

  const makeDefault = useCallback(async (id: number) => {
    const result = await adminSchoolYearsApi.setDefault(id);
    setDefaultLabel(result.default_label);
    setYears((prev) =>
      prev.map((y) => ({ ...y, is_default: y.id === result.school_year.id }))
    );
  }, []);

  const value = useMemo(
    () => ({
      years,
      defaultLabel,
      selectedYear,
      setSelectedYear,
      loading,
      error,
      refresh,
      addYear,
      makeDefault,
    }),
    [years, defaultLabel, selectedYear, setSelectedYear, loading, error, refresh, addYear, makeDefault]
  );

  return (
    <AdminSchoolYearContext.Provider value={value}>
      {children}
    </AdminSchoolYearContext.Provider>
  );
}

export function useAdminSchoolYear() {
  const context = useContext(AdminSchoolYearContext);
  if (!context) {
    throw new Error("useAdminSchoolYear must be used within AdminSchoolYearProvider");
  }
  return context;
}

export function suggestNextSchoolYear(years: SchoolYearRecord[]): string {
  return suggestNextYearLabel(years);
}
