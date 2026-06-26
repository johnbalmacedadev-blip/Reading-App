import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Save, Globe, Shield, Bell, Database, Palette, ChevronRight, Check, AlertCircle } from "lucide-react";

type SettingSection = "general" | "language" | "permissions" | "notifications" | "backup" | "appearance";

const sections: { key: SettingSection; label: string; icon: typeof Save; desc: string }[] = [
  { key: "general", label: "General", icon: Database, desc: "Platform name, contact info, system configuration" },
  { key: "language", label: "Language", icon: Globe, desc: "Default language, date and number formats" },
  { key: "permissions", label: "Permissions", icon: Shield, desc: "Access roles, feature control by portal" },
  { key: "notifications", label: "Notifications", icon: Bell, desc: "System alerts, reminders and automated emails" },
  { key: "backup", label: "Backup & Data", icon: Database, desc: "Automatic backup, retention, export" },
  { key: "appearance", label: "Appearance", icon: Palette, desc: "Theme, platform colors, logo" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
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

export function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingSection>("general");
  const [saved, setSaved] = useState(false);

  // General settings state
  const [platformName, setPlatformName] = useState("Lecture Scientifique");
  const [supportEmail, setSupportEmail] = useState("support@lecturesci.ca");
  const [schoolYear, setSchoolYear] = useState("2025-2026");

  // Language settings
  const [defaultLang, setDefaultLang] = useState("French (fr)");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // Permissions state
  const [perms, setPerms] = useState({
    teacherCanExport: true, teacherCanEditStudent: false,
    schoolCanManageTeachers: true, schoolCanViewBoard: false,
    boardCanEditSchools: false,
  });

  // Notifications state
  const [notifs, setNotifs] = useState({
    inactiveTeacherAlert: true, systemUpdate: true,
    weeklyReport: false, newUserWelcome: true, lowProgressAlert: true,
  });

  // Backup state
  const [backupFreq, setBackupFreq] = useState("Daily");
  const [retention, setRetention] = useState("12 months");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const renderContent = () => {
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
            <SettingRow label="Active School Year" desc="Reference period for data">
              <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}
                style={{ width: 160, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>2025-2026</option><option>2024-2025</option>
              </select>
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
            <SettingRow label="Default Interface Language" desc="Used if user has no preference">
              <select value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)}
                style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>French (fr)</option><option>English (en)</option>
              </select>
            </SettingRow>
            <SettingRow label="Date Format" desc="Displayed in reports and tables">
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}
                style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>DD/MM/YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option>
              </select>
            </SettingRow>
            <SettingRow label="Number Format" desc="Decimal and thousands separator">
              <select style={{ width: 200, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>1 234,56 (French)</option><option>1,234.56 (English)</option>
              </select>
            </SettingRow>
            <SettingRow label="Time Zone" desc="For audit timestamps">
              <select style={{ width: 220, padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
                <option>America/Toronto (EST/EDT)</option><option>UTC</option>
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
            <SettingRow label="Inactive Teacher Alert" desc="Notify if teacher is inactive for 30+ days">
              <Toggle checked={notifs.inactiveTeacherAlert} onChange={(v) => setNotifs((n) => ({ ...n, inactiveTeacherAlert: v }))} />
            </SettingRow>
            <SettingRow label="System Update Alerts" desc="Notify admins before scheduled maintenance">
              <Toggle checked={notifs.systemUpdate} onChange={(v) => setNotifs((n) => ({ ...n, systemUpdate: v }))} />
            </SettingRow>
            <SettingRow label="Weekly Report" desc="Automatic send every Monday morning">
              <Toggle checked={notifs.weeklyReport} onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))} />
            </SettingRow>
            <SettingRow label="Welcome Email" desc="Sent to new teachers upon creation">
              <Toggle checked={notifs.newUserWelcome} onChange={(v) => setNotifs((n) => ({ ...n, newUserWelcome: v }))} />
            </SettingRow>
            <SettingRow label="At-Risk Student Alert" desc="Notify teachers when a student moves to At Risk status">
              <Toggle checked={notifs.lowProgressAlert} onChange={(v) => setNotifs((n) => ({ ...n, lowProgressAlert: v }))} />
            </SettingRow>
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
              <button style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12, cursor: "pointer", color: "#374151", fontWeight: 500 }}>
                Export ZIP
              </button>
            </SettingRow>
            <div style={{ background: "#fffbeb", borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#374151" }}>Data reset is irreversible. Contact Anthropic support before any mass deletion.</span>
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
              <button style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12, cursor: "pointer", color: "#374151" }}>
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
          <button onClick={handleSave} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9,
            border: "none", background: saved ? "#059669" : "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.3s",
          }}>
            {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
          {/* Sidebar nav */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "10px 0", height: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {sections.map((s) => {
              const active = activeSection === s.key;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "11px 16px", border: "none", cursor: "pointer", textAlign: "left",
                  background: active ? "#f0f7ff" : "transparent", color: active ? "#004aad" : "#374151",
                  borderLeft: active ? "3px solid #004aad" : "3px solid transparent",
                }}>
                  <s.icon size={15} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{s.label}</div>
                  </div>
                  {active && <ChevronRight size={13} />}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", margin: "0 0 4px" }}>
                {sections.find(s => s.key === activeSection)?.label}
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                {sections.find(s => s.key === activeSection)?.desc}
              </p>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
