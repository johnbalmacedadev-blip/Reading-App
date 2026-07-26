import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import {
  ApiError,
  backupApi,
  type BackupRecord,
  type BackupSettings,
} from "../../api/client";

const defaultSettings: BackupSettings = {
  enabled: false,
  frequency: "daily",
  time: "02:00",
  day_of_week: 0,
  day_of_month: 1,
  backup_type: "database",
  retention_count: 7,
  timezone: "America/Toronto",
  last_run_at: null,
  next_run_at: null,
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function downloadBackup(backup: BackupRecord) {
  const response = await fetch(backupApi.downloadUrl(backup.id), {
    credentials: "include",
    headers: { Accept: "application/octet-stream", "X-Requested-With": "XMLHttpRequest" },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Download failed.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backup.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"database" | "full" | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await backupApi.list();
      setBackups(data.backups);
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load backups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (type: "database" | "full") => {
    setGenerating(type);
    setError("");
    setNotice("");
    try {
      const result = await backupApi.create(type);
      setBackups((current) => [result.backup, ...current]);
      setNotice(
        type === "database"
          ? "Database backup generated and ready to download."
          : "Complete application ZIP generated and ready to download.",
      );
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Backup failed.");
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = async (backup: BackupRecord) => {
    setDownloadingId(backup.id);
    setError("");
    try {
      await downloadBackup(backup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const remove = async (backup: BackupRecord) => {
    if (!window.confirm(`Delete ${backup.filename}? This cannot be undone.`)) return;
    setDeletingId(backup.id);
    setError("");
    try {
      await backupApi.remove(backup.id);
      setBackups((current) => current.filter((item) => item.id !== backup.id));
      setNotice("Backup deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const saveSchedule = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await backupApi.updateSettings(settings);
      setSettings(result.settings);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #dbe3ed",
    background: "white",
    color: "#1e293b",
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px", maxWidth: 1180 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Backup</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              Generate, export, and schedule secure system backups.
            </p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", border: "1px solid #dbe3ed", borderRadius: 9, background: "white", color: "#475569", cursor: loading ? "wait" : "pointer" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13 }}>
            <AlertTriangle size={17} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
        {notice && (
          <div style={{ display: "flex", gap: 9, alignItems: "center", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13 }}>
            <CheckCircle2 size={17} /> {notice}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, marginBottom: 22 }}>
          <BackupCard
            icon={<Database size={22} />}
            title="Database backup"
            description="Export the complete MySQL database as a compressed SQL file."
            button="Generate database backup"
            color="#004aad"
            loading={generating === "database"}
            disabled={generating !== null}
            onClick={() => void generate("database")}
          />
          <BackupCard
            icon={<Archive size={22} />}
            title="Complete application ZIP"
            description="Archive the database and application files, including private configuration needed for recovery."
            button="Generate complete ZIP"
            color="#7c3aed"
            loading={generating === "full"}
            disabled={generating !== null}
            onClick={() => void generate("full")}
          />
        </div>

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "11px 14px", color: "#92400e", fontSize: 12, lineHeight: 1.5, marginBottom: 22 }}>
          <strong>Keep exports private.</strong> Database and complete backups contain sensitive account data. Complete ZIP files also contain application configuration and credentials.
        </div>

        <section style={{ background: "white", border: "1px solid #edf1f5", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ background: "#e0f2fe", color: "#0369a1", padding: 9, borderRadius: 9 }}><CalendarClock size={19} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>Automatic backup schedule</h2>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                Scheduled exports are stored privately on the server.
              </p>
            </div>
            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
              Enabled
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 14 }}>
            <Field label="Backup content">
              <select value={settings.backup_type} onChange={(event) => setSettings({ ...settings, backup_type: event.target.value as BackupSettings["backup_type"] })} style={inputStyle}>
                <option value="database">Database only</option>
                <option value="full">Complete ZIP</option>
              </select>
            </Field>
            <Field label="Frequency">
              <select value={settings.frequency} onChange={(event) => setSettings({ ...settings, frequency: event.target.value as BackupSettings["frequency"] })} style={inputStyle}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            {settings.frequency === "weekly" && (
              <Field label="Day of week">
                <select value={settings.day_of_week} onChange={(event) => setSettings({ ...settings, day_of_week: Number(event.target.value) })} style={inputStyle}>
                  {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </Field>
            )}
            {settings.frequency === "monthly" && (
              <Field label="Day of month">
                <input type="number" min={1} max={31} value={settings.day_of_month} onChange={(event) => setSettings({ ...settings, day_of_month: Number(event.target.value) })} style={inputStyle} />
              </Field>
            )}
            <Field label="Time">
              <input type="time" value={settings.time} onChange={(event) => setSettings({ ...settings, time: event.target.value })} style={inputStyle} />
            </Field>
            <Field label="Timezone">
              <select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} style={inputStyle}>
                <option value="America/Toronto">Eastern — Toronto</option>
                <option value="America/Winnipeg">Central — Winnipeg</option>
                <option value="America/Edmonton">Mountain — Edmonton</option>
                <option value="America/Vancouver">Pacific — Vancouver</option>
                <option value="UTC">UTC</option>
              </select>
            </Field>
            <Field label="Keep scheduled copies">
              <input type="number" min={1} max={50} value={settings.retention_count} onChange={(event) => setSettings({ ...settings, retention_count: Number(event.target.value) })} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 18, paddingTop: 16, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              <div>Last automatic backup: <strong style={{ color: "#334155" }}>{formatDate(settings.last_run_at)}</strong></div>
              <div>Next run: <strong style={{ color: "#334155" }}>{settings.enabled ? formatDate(settings.next_run_at) : "Disabled"}</strong></div>
            </div>
            <button type="button" onClick={() => void saveSchedule()} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", border: 0, borderRadius: 9, background: "#004aad", color: "white", fontWeight: 600, fontSize: 13, cursor: saving ? "wait" : "pointer" }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save schedule
            </button>
          </div>
        </section>

        <section style={{ background: "white", border: "1px solid #edf1f5", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid #f1f5f9" }}>
            <HardDrive size={18} color="#475569" />
            <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Backup history</h2>
            <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 12 }}>{backups.length} copies</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, display: "flex", justifyContent: "center", gap: 9, color: "#64748b", fontSize: 13 }}>
              <Loader2 size={19} className="animate-spin" /> Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No backups have been generated yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Backup", "Type", "Created", "Size", "Source", "Status", "Actions"].map((heading) => (
                      <th key={heading} style={{ padding: "11px 15px", textAlign: "left", color: "#64748b", fontSize: 11, fontWeight: 600 }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "13px 15px", fontSize: 12, color: "#334155", fontFamily: "monospace", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={backup.filename}>{backup.filename}</td>
                      <td style={{ padding: "13px 15px", fontSize: 12, color: "#475569" }}>{backup.type === "full" ? "Complete ZIP" : "Database"}</td>
                      <td style={{ padding: "13px 15px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatDate(backup.created_at)}</td>
                      <td style={{ padding: "13px 15px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{backup.size_label}</td>
                      <td style={{ padding: "13px 15px", fontSize: 12, color: "#475569" }}>{backup.trigger === "scheduled" ? "Automatic" : backup.created_by}</td>
                      <td style={{ padding: "13px 15px" }}>
                        <span title={backup.error || undefined} style={{
                          display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: backup.status === "completed" ? "#ecfdf5" : backup.status === "failed" ? "#fff1f2" : "#eff6ff",
                          color: backup.status === "completed" ? "#047857" : backup.status === "failed" ? "#be123c" : "#1d4ed8",
                        }}>
                          {backup.status === "completed" ? <CheckCircle2 size={11} /> : backup.status === "failed" ? <AlertTriangle size={11} /> : <Loader2 size={11} className="animate-spin" />}
                          {backup.status}
                        </span>
                      </td>
                      <td style={{ padding: "13px 15px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" title="Download" disabled={!backup.available || downloadingId === backup.id} onClick={() => void handleDownload(backup)}
                            style={{ padding: 7, borderRadius: 7, border: "1px solid #dbe3ed", background: "white", color: backup.available ? "#004aad" : "#cbd5e1", cursor: backup.available ? "pointer" : "not-allowed" }}>
                            {downloadingId === backup.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          <button type="button" title="Delete" disabled={deletingId === backup.id} onClick={() => void remove(backup)}
                            style={{ padding: 7, borderRadius: 7, border: "1px solid #fecdd3", background: "#fff", color: "#e11d48", cursor: deletingId === backup.id ? "wait" : "pointer" }}>
                            {deletingId === backup.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function BackupCard({
  icon,
  title,
  description,
  button,
  color,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  button: string;
  color: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{ background: "white", border: "1px solid #edf1f5", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, background: `${color}12`, color, marginBottom: 14 }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 17, color: "#0f172a", margin: "0 0 7px" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, minHeight: 40, margin: "0 0 18px" }}>{description}</p>
      <button type="button" onClick={onClick} disabled={disabled}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px 14px", border: 0, borderRadius: 9, background: color, color: "white", fontSize: 13, fontWeight: 600, cursor: disabled ? "wait" : "pointer", opacity: disabled && !loading ? 0.55 : 1 }}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {loading ? "Generating backup..." : button}
      </button>
    </div>
  );
}
