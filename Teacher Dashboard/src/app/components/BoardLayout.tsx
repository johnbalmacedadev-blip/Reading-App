import { type ReactNode } from "react";
import { useNavigate } from "react-router";
import { LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { BrandMark } from "../components/BrandMark";
import { useLanguage } from "../i18n";
import { boardNavItems, type BoardNavActive } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";
import { InstitutionalTrialBanner } from "./InstitutionalTrialBanner";

import { useCollapsibleSidebar } from "../hooks/useCollapsibleSidebar";

export function BoardLayout({
  activeNav,
  children,
  contentClassName = "flex-1 overflow-y-auto p-8",
  pageBackground = "#dff3ff",
}: {
  activeNav: BoardNavActive;
  children: ReactNode;
  contentClassName?: string;
  pageBackground?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleLogout = usePortalLogout();
  const { collapsed, collapse, expand } = useCollapsibleSidebar("board-sidebar-collapsed");

  const menuItems = boardNavItems(t, activeNav);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: pageBackground }}>
      <aside
        className="flex flex-col overflow-hidden shrink-0 transition-[width,padding,opacity] duration-300 ease-in-out"
        style={{
          width: collapsed ? 0 : 256,
          background: "#ffffff",
          borderRight: collapsed ? "none" : "1px solid #dff3ff",
          padding: collapsed ? 0 : 24,
          opacity: collapsed ? 0 : 1,
        }}
        aria-hidden={collapsed}
      >
        <div className="flex items-center justify-between gap-2 mb-10 min-w-[208px]">
          <div className="min-w-0 flex-1">
            <BrandMark height={34} />
            <p
              className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block"
              style={{ background: "#dff3ff", color: "#004aad" }}
            >
              {t("board.portal")}
            </p>
          </div>
          <button
            type="button"
            onClick={collapse}
            title="Hide menu"
            aria-label="Hide menu"
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
          >
            <PanelLeftClose className="w-5 h-5" style={{ color: "#64748b" }} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 min-w-[208px] overflow-y-auto">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm"
              style={{
                background: active ? "#dff3ff" : "transparent",
                color: active ? "#004aad" : "#444",
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-[208px] space-y-2">
          <InstitutionalTrialBanner subscriptionPath="/board/subscription" compact />
          <LangToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm w-full"
            style={{ color: "#ff5757" }}
          >
            <LogOut className="w-4 h-4" />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {collapsed && (
          <button
            type="button"
            onClick={expand}
            title="Show menu"
            aria-label="Show menu"
            className="absolute top-4 left-4 z-20 p-2.5 rounded-xl shadow-sm transition-colors hover:bg-slate-50"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <PanelLeft className="w-5 h-5" style={{ color: "#004aad" }} />
          </button>
        )}
        <div className={`${contentClassName}${collapsed ? " pt-14" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
