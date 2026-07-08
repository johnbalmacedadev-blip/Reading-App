import { useNavigate, useLocation } from "react-router";
import {
  BookOpen, LogOut, BarChart3, Settings, FileText, Users, User, GraduationCap,
} from "lucide-react";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { boardNavItems } from "../i18n/navHelpers";
import { usePortalLogout } from "../hooks/usePortalLogout";

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, auto: a } = useLanguage();
  const handleLogout = usePortalLogout();

  // Determine if this is board or school settings based on the path
  const isBoard = location.pathname.includes("/board");

  const menuItems = isBoard
    ? boardNavItems(t, "settings")
    : [
        { icon: BarChart3, label: t("common.overview"), active: false, path: "/school/reports" },
        { icon: GraduationCap, label: a("Académiques"), active: false, path: "/school/academics" },
        { icon: FileText, label: t("nav.assessments"), active: false, path: "/school/assessments" },
        { icon: User, label: t("nav.profile"), active: false, path: "/profile?portal=school" },
        { icon: Settings, label: t("nav.settings"), active: true, path: "/school/settings" },
      ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div className="w-64 p-6 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}>
        <div className="flex items-center gap-3 mb-10">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "#dff3ff", color: "#004aad" }}>
              {isBoard ? t("board.portal") : t("school.portal")}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map(({ icon: Icon, label, active, path }) => (
            <button key={label} onClick={() => navigate(path)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm"
              style={{ background: active ? "#dff3ff" : "transparent", color: active ? "#004aad" : "#444", fontWeight: active ? 600 : 400 }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <LangToggle />
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm" style={{ color: "#ff5757" }}>
          <LogOut className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#004aad" }}>
            {t("settings.title")}
          </h1>
          <p className="text-base" style={{ color: "#666" }}>
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Settings sections */}
        <div className="space-y-6">
          {isBoard && (
            <>
              {/* Board-Level Controls */}
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
                <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
                  {t("settings.boardControls")}
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "#004aad" }}>
                      {t("settings.languageManagement")}
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.allowFrench")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.allowEnglish")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.teachersChangeLanguage")}</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "#dff3ff" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "#004aad" }}>
                      {t("settings.smlManagement")}
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.schoolsModifyAteliers")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} />
                        <span style={{ color: "#000" }}>{t("settings.lockAteliers1to17")}</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "#dff3ff" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "#004aad" }}>
                      {t("settings.accessPermissions")}
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.allowSchoolsExport")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.allowNotRequired")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                        <span style={{ color: "#000" }}>{t("settings.shareAnonymousData")}</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "#dff3ff" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "#004aad" }}>
                      {t("settings.schoolYear")}
                    </h3>
                    <div className="space-y-2">
                      <label className="block text-sm mb-2" style={{ color: "#666" }}>
                        {t("settings.activeSchoolYear")}
                      </label>
                      <select className="w-full px-4 py-3 rounded-xl border" style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}>
                        <option value="2025-2026">2025-2026</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2023-2024">2023-2024</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "#dff3ff" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "#004aad" }}>
                      {t("settings.performanceThresholds")}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs mb-2" style={{ color: "#666" }}>{t("settings.onTrackGreen")}</label>
                        <input type="number" defaultValue="75" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }} />
                        <span className="text-xs" style={{ color: "#666" }}>%</span>
                      </div>
                      <div>
                        <label className="block text-xs mb-2" style={{ color: "#666" }}>{t("settings.monitorYellow")}</label>
                        <input type="number" defaultValue="50" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }} />
                        <span className="text-xs" style={{ color: "#666" }}>%</span>
                      </div>
                      <div>
                        <label className="block text-xs mb-2" style={{ color: "#666" }}>{t("settings.atRiskRed")}</label>
                        <input type="number" defaultValue="50" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }} />
                        <span className="text-xs" style={{ color: "#666" }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Account Settings */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
              {t("settings.account")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#004aad" }}>
                  {t("settings.username")}
                </label>
                <input
                  type="text"
                  value={a("Utilisateur")}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#004aad" }}>
                  {t("settings.email")}
                </label>
                <input
                  type="email"
                  value="utilisateur@example.com"
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: "#ffffff", borderColor: "#dff3ff", color: "#000" }}
                />
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
              {t("settings.language")}
            </h2>
            <p className="text-sm mb-3" style={{ color: "#666" }}>
              {t("settings.languageDescription")}
            </p>
          </div>

          {/* Notification Settings */}
          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #dff3ff" }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: "#004aad" }}>
              {t("settings.notifications")}
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                <span style={{ color: "#000" }}>{t("settings.emailNotifications")}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: "#004aad" }} defaultChecked />
                <span style={{ color: "#000" }}>{t("settings.studentProgressAlerts")}</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button
            className="px-6 py-3 rounded-xl transition-all"
            style={{ background: "#004aad", color: "#ffffff" }}
          >
            {t("settings.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
