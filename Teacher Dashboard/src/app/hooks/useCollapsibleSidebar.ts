import { useEffect, useState } from "react";

export function useCollapsibleSidebar(storageKey: string) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [collapsed, storageKey]);

  return {
    collapsed,
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false),
  };
}
