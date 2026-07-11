import { useEffect } from "react";
import { useLocation } from "react-router";
import { APP_NAME, useLanguage } from "../i18n";
import { formatDocumentTitle, resolvePageTitleParts } from "../pageTitle";

export function PageTitle() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const parts = resolvePageTitleParts(pathname);
    document.title = formatDocumentTitle(parts, t, APP_NAME);
  }, [pathname, t]);

  return null;
}
