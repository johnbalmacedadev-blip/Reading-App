import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Save, Globe, Shield, Bell, Database, Palette, Check, AlertCircle, Loader2, Mail } from "lucide-react";
import { useAdminSchoolYear } from "../../context/AdminSchoolYearContext";
import {
  adminAnnouncementsApi,
  adminSettingsApi,
  type EmailTemplateCatalogItem,
  type EmailTemplatesPayload,
  type PlatformSettings,
  type SystemAnnouncementCategory,
  type SystemAnnouncementRecord,
} from "../../api/client";

type SettingSection = "general" | "language" | "permissions" | "notifications" | "emails" | "backup" | "appearance";

const sections: { key: SettingSection; label: string; icon: typeof Save; desc: string }[] = [
  { key: "general", label: "General", icon: Database, desc: "Platform name, contact info, system configuration" },
  { key: "language", label: "Language", icon: Globe, desc: "Default language for emails and interface fallback" },
  { key: "permissions", label: "Permissions", icon: Shield, desc: "Access roles, feature control by portal" },
  { key: "notifications", label: "Notifications", icon: Bell, desc: "System alerts, reminders and automated emails" },
  { key: "emails", label: "Email templates", icon: Mail, desc: "Subject, body, and logo for outbound emails" },
  { key: "backup", label: "Backup & Data", icon: Database, desc: "Automatic backup, retention, export" },
  { key: "appearance", label: "Appearance", icon: Palette, desc: "Theme, platform colors, logo" },
];

const PLACEHOLDER_HINT =
  "Use placeholders where needed: :name, :email, :days, :date, :plan, :portal, :password, :url, :minutes, :title, :message";

const MULTILINE_FIELDS = new Set(["body", "ready", "help", "thanks", "activate_help", "created", "ignore", "after"]);

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? "#004aad" : "#e2e8f0",
      border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "white",
        position: "absolute", top: 3, left: checked ? 23 : 3, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

const defaultSettings: PlatformSettings = {
  default_language: "fr",
  date_format: "DD/MM/YYYY",
  number_format: "fr",
  timezone: "America/Toronto",
  platform_name: "Lecture Scientifique",
  support_email: "support@lecturesci.ca",
};

const emptyTemplates = (): EmailTemplatesPayload["templates"] => ({ en: {}, fr: {} });

export function AdminSettingsPage() {
  const { defaultLabel, years } = useAdminSchoolYear();
  const [activeSection, setActiveSection] = useState<SettingSection>("general");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [platformName, setPlatformName] = useState(defaultSettings.platform_name);
  const [supportEmail, setSupportEmail] = useState(defaultSettings.support_email);
  const [defaultLang, setDefaultLang] = useState<"en" | "fr">(defaultSettings.default_language);
  const [dateFormat, setDateFormat] = useState(defaultSettings.date_format);
  const [numberFormat, setNumberFormat] = useState<"en" | "fr">(defaultSettings.number_format);
  const [timezone, setTimezone] = useState(defaultSettings.timezone);

  const [announcements, setAnnouncements] = useState<SystemAnnouncementRecord[]>([]);
  const [announcementCategories, setAnnouncementCategories] = useState<{ value: SystemAnnouncementCategory; label: string }[]>([]);
  const [announceCategory, setAnnounceCategory] = useState<SystemAnnouncementCategory>("platform_announcement");
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceUrl, setAnnounceUrl] = useState("");
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceNotice, setAnnounceNotice] = useState("");

  const [emailCatalog, setEmailCatalog] = useState<EmailTemplateCatalogItem[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesPayload["templates"]>(emptyTemplates);
  const [emailLocale, setEmailLocale] = useState<"en" | "fr">("en");
  const [selectedEmailKey, setSelectedEmailKey] = useState("inactive_reminder");
  const [emailLogoUri, setEmailLogoUri] = useState<string | null>(null);
  const [hasCustomEmailLogo, setHasCustomEmailLogo] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [perms, setPerms] = useState({
    teacherCanExport: true, teacherCanEditStudent: false,
    schoolCanManageTeachers: true, schoolCanViewBoard: false,
    boardCanEditSchools: false,
  });

  const [backupFreq, setBackupFreq] = useState("Daily");
  const [retention, setRetention] = useState("12 months");

  const selectedEmail = useMemo(
    () => emailCatalog.find((item) => item.key === selectedEmailKey) ?? emailCatalog[0] ?? null,
    [emailCatalog, selectedEmailKey],
  );

  const canSaveTop = activeSection === "general" || activeSection === "language" || activeSection === "emails";

  const applySettings = useCallback((settings: PlatformSettings) => {
    setPlatformName(settings.platform_name);
    setSupportEmail(settings.support_email);
    setDefaultLang(settings.default_language);
    setDateFormat(settings.date_format);
    setNumberFormat(settings.number_format);
    setTimezone(settings.timezone);
  }, []);

  const applyEmailPayload = useCallback((payload: EmailTemplatesPayload) => {
    setEmailCatalog(payload.catalog);
    setEmailTemplates(payload.templates);
    setEmailLogoUri(payload.logo_data_uri);
    setHasCustomEmailLogo(payload.has_custom_logo);
    if (payload.catalog.length > 0) {
      setSelectedEmailKey((current) =>
        payload.catalog.some((item) => item.key === current) ? current : payload.catalog[0].key,
      );
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const result = await adminAnnouncementsApi.list();
      setAnnouncements(result.announcements);
      setAnnouncementCategories(result.categories);
      if (result.categories[0]) {
        setAnnounceCategory((current) =>
          result.categories.some((c) => c.value === current) ? current : result.categories[0].value,
        );
      }
    } catch {
      // Keep settings usable even if announcements fail to load.
    }
  }, []);

  const loadEmailTemplates = useCallback(async () => {
    setEmailLoading(true);
    try {
      const payload = await adminSettingsApi.getEmailTemplates();
      applyEmailPayload(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email templates.");
    } finally {
      setEmailLoading(false);
    }
  }, [applyEmailPayload]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { settings } = await adminSettingsApi.get();
      applySettings(settings);
      await loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [applySettings, loadAnnouncements]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeSection === "emails" && emailCatalog.length === 0 && !emailLoading) {
      void loadEmailTemplates();
    }
  }, [activeSection, emailCatalog.length, emailLoading, loadEmailTemplates]);

  const handleSendAnnouncement = async () => {
    if (!announceTitle.trim() || !announceMessage.trim()) {
      setAnnounceNotice("Title and message are required.");
      return;
    }
    setAnnounceSending(true);
    setAnnounceNotice("");
    try {
      const result = await adminAnnouncementsApi.create({
        category: announceCategory,
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        url: announceUrl.trim() || undefined,
      });
      setAnnounceNotice(result.message);
      setAnnounceTitle("");
      setAnnounceMessage("");
      setAnnounceUrl("");
      setAnnouncements((prev) => [result.announcement, ...prev].slice(0, 50));
    } catch (err) {
      setAnnounceNotice(err instanceof Error ? err.message : "Failed to send announcement.");
    } finally {
      setAnnounceSending(false);
    }
  };

  const updateEmailField = (field: string, value: string) => {
    if (!selectedEmail) return;
    setEmailTemplates((prev) => ({
      ...prev,
      [emailLocale]: {
        ...prev[emailLocale],
        [selectedEmail.key]: {
          ...(prev[emailLocale]?.[selectedEmail.key] ?? {}),
          [field]: value,
        },
      },
    }));
  };

  const handleUploadEmailLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    setError("");
    try {
      const result = await adminSettingsApi.uploadEmailLogo(file);
      setEmailLogoUri(result.logo_data_uri);
      setHasCustomEmailLogo(result.has_custom_logo);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload email logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleResetEmailLogo = async () => {
    setLogoUploading(true);
    setError("");
    try {
      const result = await adminSettingsApi.resetEmailLogo();
      setEmailLogoUri(result.logo_data_uri);
      setHasCustomEmailLogo(result.has_custom_logo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset email logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveEmailTemplates = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await adminSettingsApi.updateEmailTemplates(emailTemplates);
      applyEmailPayload(result);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save email templates.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (activeSection === "emails") {
      await handleSaveEmailTemplates();
      return;
    }
    if (activeSection !== "general" && activeSection !== "language") return;

    setSaving(true);
    setError("");
    try {
      const { settings } = await adminSettingsApi.update({
        platform_name: platformName.trim() || "Lecture Scientifique",
        support_email: supportEmail.trim(),
        default_language: defaultLang,
        date_format: dateFormat,
        number_format: numberFormat,
        timezone,
      });
      applySettings(settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: "40px 0", display: "flex", alignItems: "center", gap: 8, color: "#004aad" }}>
          <Loader2 size={18} className="animate-spin" /> Loading settings…
        </div>
      );
    }

    switch (activeSection) {
      case "general":
        return (
          <div>
            <SettingRow label="Platform Name" desc="Displayed in headers and emails">
              <input value={platformName} onChange={(e) => setPlatformName(e.target.value)}
                style={{ width: 260, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
            </SettingRow>
            <SettingRow label="Support Email" desc="Used for system notifications">
              <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)}
                style={{ width: 260, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
            </SettingRow>
            <SettingRow label="Default School Year" desc="Used when creating new classes and as the initial portal view">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#004aad" }}>{defaultLabel || "—"}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {years.length} school year{years.length === 1 ? "" : "s"} configured — use the selector at the top right to add or change default
                </div>
              </div>
            </SettingRow>
            <SettingRow label="Maintenance Mode" desc="Disables access for all non-admin portals">
              <Toggle checked={false} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Open Registration" desc="Allow creation of new teacher accounts">
              <Toggle checked={true} onChange={() => {}} />
            </SettingRow>
          </div>
        );

      case "language":
        return (
          <div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
              This language is used for system emails (welcome, activation, password reset). If English is selected, those emails are sent in English.
            </div>
            <SettingRow label="Default Language" desc="Used for email notifications and as the fallback interface language">
              <select value={defaultLang} onChange={(e) => setDefaultLang(e.target.value as "en" | "fr")}
                style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option value="fr">French (fr)</option>
                <option value="en">English (en)</option>
              </select>
            </SettingRow>
            <SettingRow label="Date Format" desc="Displayed in reports and tables">
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}
                style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </SettingRow>
            <SettingRow label="Number Format" desc="Decimal and thousands separator">
              <select value={numberFormat} onChange={(e) => setNumberFormat(e.target.value as "en" | "fr")}
                style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option value="fr">1 234,56 (French)</option>
                <option value="en">1,234.56 (English)</option>
              </select>
            </SettingRow>
            <SettingRow label="Time Zone" desc="For audit timestamps">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                style={{ width: 220, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                <option value="UTC">UTC</option>
              </select>
            </SettingRow>
          </div>
        );

      case "permissions":
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, marginTop: 4, textTransform: "uppercase" }}>Teacher Portal</div>
            <SettingRow label="Report Export" desc="Teachers can export data to CSV/PDF">
              <Toggle checked={perms.teacherCanExport} onChange={(v) => setPerms((p) => ({ ...p, teacherCanExport: v }))} />
            </SettingRow>
            <SettingRow label="Student Record Editing" desc="Teachers can modify basic information">
              <Toggle checked={perms.teacherCanEditStudent} onChange={(v) => setPerms((p) => ({ ...p, teacherCanEditStudent: v }))} />
            </SettingRow>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: "uppercase" }}>School Portal</div>
            <SettingRow label="Teacher Management" desc="School admin can add/edit teachers">
              <Toggle checked={perms.schoolCanManageTeachers} onChange={(v) => setPerms((p) => ({ ...p, schoolCanManageTeachers: v }))} />
            </SettingRow>
            <SettingRow label="Board Data Access" desc="Visibility on school board statistics">
              <Toggle checked={perms.schoolCanViewBoard} onChange={(v) => setPerms((p) => ({ ...p, schoolCanViewBoard: v }))} />
            </SettingRow>
            <SettingRow label="Assessment Access" desc="School portal can view and use assessments">
              <Toggle checked={true} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Assessment Editing" desc="School portal can modify and duplicate assessments">
              <Toggle checked={true} onChange={() => {}} />
            </SettingRow>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: "uppercase" }}>School Board Portal</div>
            <SettingRow label="School Editing" desc="Board admins can modify member schools">
              <Toggle checked={perms.boardCanEditSchools} onChange={(v) => setPerms((p) => ({ ...p, boardCanEditSchools: v }))} />
            </SettingRow>
          </div>
        );

      case "notifications":
        return (
          <div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
              Account and billing alerts are automatic: trial ending soon, successful payment, payment failed, subscription renewed/cancelled, and subscription expiry.
              Use this form for system maintenance, outages, feature releases, and platform announcements.
              Edit email subject and body copy under <strong>Email templates</strong>.
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>
              Broadcast to teachers
            </div>
            <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Category</label>
                <select
                  value={announceCategory}
                  onChange={(e) => setAnnounceCategory(e.target.value as SystemAnnouncementCategory)}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }}
                >
                  {(announcementCategories.length
                    ? announcementCategories
                    : [
                        { value: "scheduled_maintenance" as const, label: "Scheduled maintenance" },
                        { value: "unexpected_outage" as const, label: "Unexpected outage" },
                        { value: "feature_release" as const, label: "Major feature release" },
                        { value: "platform_announcement" as const, label: "Important platform announcement" },
                      ]
                  ).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Title</label>
                <input
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="e.g. Scheduled maintenance tonight"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Message</label>
                <textarea
                  value={announceMessage}
                  onChange={(e) => setAnnounceMessage(e.target.value)}
                  rows={4}
                  placeholder="Write the notification teachers will see in their bell menu."
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Optional link</label>
                <input
                  value={announceUrl}
                  onChange={(e) => setAnnounceUrl(e.target.value)}
                  placeholder="/library or https://..."
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => void handleSendAnnouncement()}
                  disabled={announceSending}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#004aad",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: announceSending ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {announceSending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  Send to teachers
                </button>
                {announceNotice && (
                  <span style={{ fontSize: 12, color: announceNotice.toLowerCase().includes("fail") || announceNotice.includes("required") ? "#be123c" : "#047857" }}>
                    {announceNotice}
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>
              Recent broadcasts
            </div>
            {announcements.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8", padding: "12px 0" }}>No announcements sent yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {announcements.slice(0, 8).map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{item.title}</strong>
                      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{item.delivered_count} teachers</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#004aad", fontWeight: 600, marginBottom: 4 }}>{item.category_label}</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{item.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "emails":
        if (emailLoading && emailCatalog.length === 0) {
          return (
            <div style={{ padding: "40px 0", display: "flex", alignItems: "center", gap: 8, color: "#004aad" }}>
              <Loader2 size={18} className="animate-spin" /> Loading email templates…
            </div>
          );
        }

        return (
          <div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#1e40af", lineHeight: 1.55 }}>
              Edit subject, heading, body, and button text for each automated email. Changes apply to new emails only.
              Clearing a field and saving restores the default. {PLACEHOLDER_HINT}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>
              Email logo
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              marginBottom: 20,
              background: "#f8fafc",
            }}>
              <div style={{
                width: 160,
                height: 56,
                borderRadius: 8,
                background: "white",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                {emailLogoUri ? (
                  <img src={emailLogoUri} alt="Email logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>No logo</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                  Shared logo for all emails
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                  PNG, JPG, or WebP up to 2 MB. Used in the header of every outbound email.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    background: "white",
                    fontSize: 12,
                    cursor: logoUploading ? "wait" : "pointer",
                    color: "#374151",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    {logoUploading ? <Loader2 size={12} className="animate-spin" /> : null}
                    Change logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: "none" }}
                      disabled={logoUploading}
                      onChange={(e) => {
                        void handleUploadEmailLogo(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {hasCustomEmailLogo && (
                    <button
                      type="button"
                      onClick={() => void handleResetEmailLogo()}
                      disabled={logoUploading}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 7,
                        border: "1px solid #e2e8f0",
                        background: "white",
                        fontSize: 12,
                        cursor: "pointer",
                        color: "#64748b",
                      }}
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", height: "fit-content", maxHeight: 520, overflowY: "auto" }}>
                {emailCatalog.map((item) => {
                  const active = selectedEmail?.key === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedEmailKey(item.key)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: active ? "#f0f7ff" : "white",
                        color: active ? "#004aad" : "#334155",
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                    {selectedEmail?.label ?? "Select a template"}
                  </div>
                  <div style={{ display: "inline-flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {(["en", "fr"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setEmailLocale(lang)}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          background: emailLocale === lang ? "#004aad" : "white",
                          color: emailLocale === lang ? "white" : "#475569",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedEmail && (
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedEmail.fields.map((field) => {
                      const value = emailTemplates[emailLocale]?.[selectedEmail.key]?.[field.key] ?? "";
                      const isMultiline = MULTILINE_FIELDS.has(field.key) || field.key === "body";
                      return (
                        <div key={field.key}>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                            {field.label}
                          </label>
                          {isMultiline ? (
                            <textarea
                              value={value}
                              onChange={(e) => updateEmailField(field.key, e.target.value)}
                              rows={field.key === "body" ? 4 : 3}
                              style={{
                                width: "100%",
                                padding: "9px 10px",
                                borderRadius: 7,
                                border: "1px solid #e2e8f0",
                                fontSize: 13,
                                resize: "vertical",
                                boxSizing: "border-box",
                                lineHeight: 1.45,
                              }}
                            />
                          ) : (
                            <input
                              value={value}
                              onChange={(e) => updateEmailField(field.key, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "9px 10px",
                                borderRadius: 7,
                                border: "1px solid #e2e8f0",
                                fontSize: 13,
                                boxSizing: "border-box",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "backup":
        return (
          <div>
            <SettingRow label="Backup Frequency" desc="Automatic database backup">
              <select value={backupFreq} onChange={(e) => setBackupFreq(e.target.value)}
                style={{ width: 180, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>Daily</option><option>Weekly</option><option>Monthly</option>
              </select>
            </SettingRow>
            <SettingRow label="Audit Log Retention" desc="History retention period">
              <select value={retention} onChange={(e) => setRetention(e.target.value)}
                style={{ width: 180, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>6 months</option><option>12 months</option><option>24 months</option><option>Indefinite</option>
              </select>
            </SettingRow>
            <SettingRow label="Last Backup" desc="Most recent backup status">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#059669" />
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>June 18, 2026, 02:00 — Successful</span>
              </div>
            </SettingRow>
            <SettingRow label="Full Export" desc="Export all platform data">
              <button type="button" style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 500 }}>
                Export ZIP
              </button>
            </SettingRow>
            <div style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#374151" }}>Data reset is irreversible. Contact support before any mass deletion.</span>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div>
            <SettingRow label="Primary Color" desc="Brand text color and interactive elements">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "#004aad", border: "2px solid #e2e8f0" }} />
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>#004aad</span>
              </div>
            </SettingRow>
            <SettingRow label="Accent Color" desc="Used for indicators and secondary buttons">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "#38b6ff", border: "2px solid #e2e8f0" }} />
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>#38b6ff</span>
              </div>
            </SettingRow>
            <SettingRow label="Platform Logo" desc="Displayed in sidebar navigation">
              <button type="button" style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12, cursor: "pointer", color: "#374151" }}>
                Change Logo
              </button>
            </SettingRow>
            <SettingRow label="Dark Mode" desc="Enable dark theme for all portals">
              <Toggle checked={false} onChange={() => {}} />
            </SettingRow>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Settings</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Platform configuration and access control</p>
          </div>
          {canSaveTop && (
            <button type="button" onClick={() => void handleSave()} disabled={saving || loading || (activeSection === "emails" && emailLoading)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9,
              border: "none", background: saved ? "#059669" : "#004aad", color: "white", fontSize: 13, fontWeight: 600,
              cursor: saving || loading ? "wait" : "pointer", transition: "background 0.3s", opacity: saving || loading ? 0.8 : 1,
            }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "10px 0", height: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {sections.map((s) => {
              const active = activeSection === s.key;
              return (
                <button key={s.key} type="button" onClick={() => setActiveSection(s.key)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "11px 16px", border: "none", cursor: "pointer", textAlign: "left",
                  background: active ? "#f0f7ff" : "transparent", color: active ? "#004aad" : "#374151",
                  borderLeft: active ? "3px solid #004aad" : "3px solid transparent",
                }}>
                  <s.icon size={15} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "8px 24px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", padding: "16px 0 8px" }}>
              {sections.find((s) => s.key === activeSection)?.label}
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
