import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  type ResourceAccessCatalogCategory,
  type ResourceAccessExportItem,
  type ResourceAccessItemPayload,
} from "../api/client";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? "#004aad" : "#e2e8f0",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

function CheckRow({
  checked,
  title,
  hint,
  onChange,
}: {
  checked: boolean;
  title: string;
  hint?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        cursor: "pointer",
        background: checked ? "#f0f7ff" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "#004aad", width: 15, height: 15 }}
      />
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{title}</span>
        {hint ? <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 2 }}>{hint}</span> : null}
      </span>
    </label>
  );
}

function itemKey(kind: string, resourceKey: string) {
  return `${kind}:${resourceKey}`;
}

export function ResourceAccessToggle({
  enabled,
  disabled,
  onConfigure,
  onDisable,
}: {
  enabled: boolean;
  disabled?: boolean;
  onConfigure: () => void;
  onDisable: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Toggle
        checked={enabled}
        onChange={(next) => {
          if (disabled) return;
          if (next) onConfigure();
          else onDisable();
        }}
      />
      {enabled ? (
        <button
          type="button"
          onClick={onConfigure}
          disabled={disabled}
          style={{
            border: "none",
            background: "none",
            color: "#004aad",
            fontSize: 11,
            fontWeight: 600,
            cursor: disabled ? "wait" : "pointer",
            padding: 0,
          }}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

export function ResourceAccessModal({
  open,
  title,
  subjectName,
  subjectId,
  load,
  save,
  onClose,
  onSaved,
}: {
  open: boolean;
  title: string;
  subjectName: string;
  subjectId?: number | null;
  load: () => Promise<{
    enabled: boolean;
    items: ResourceAccessItemPayload[];
    downloadable?: ResourceAccessCatalogCategory[];
    exports?: ResourceAccessExportItem[];
  }>;
  save: (payload: { enabled: boolean; items: ResourceAccessItemPayload[] }) => Promise<{ enabled: boolean; message?: string }>;
  onClose: () => void;
  onSaved: (enabled: boolean, message?: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [downloadable, setDownloadable] = useState<ResourceAccessCatalogCategory[]>([]);
  const [exports, setExports] = useState<ResourceAccessExportItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    loadRef
      .current()
      .then((payload) => {
        if (cancelled) return;
        setDownloadable(payload.downloadable ?? []);
        setExports(payload.exports ?? []);
        setSelected(new Set((payload.items ?? []).map((item) => itemKey(item.kind, item.resource_key))));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load resources.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, subjectId]);

  const selectedCount = selected.size;
  const allDownloadableKeys = useMemo(
    () => downloadable.flatMap((category) => category.resources.map((resource) => itemKey("downloadable", String(resource.id)))),
    [downloadable],
  );
  const allExportKeys = useMemo(
    () => exports.map((item) => itemKey("export", item.key)),
    [exports],
  );

  const toggle = (key: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const setMany = (keys: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => {
        if (on) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleSave = async (enabled: boolean) => {
    if (enabled && selectedCount === 0) {
      setError("Select at least one downloadable or export resource.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const items: ResourceAccessItemPayload[] = [...selected].map((token) => {
        const [kind, ...rest] = token.split(":");
        return { kind: kind as "downloadable" | "export", resource_key: rest.join(":") };
      });
      const result = await save({ enabled, items });
      onSaved(result.enabled, result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.45)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "88vh",
          overflow: "hidden",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(15,23,42,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>{title}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{subjectName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ border: "none", background: "#f8fafc", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: "8px 20px 16px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#004aad", padding: "28px 0" }}>
              <Loader2 size={18} className="animate-spin" /> Loading resources…
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "12px 0 16px" }}>
                Choose which downloadable files and exports this account may use. Unchecked items stay blocked for trial accounts.
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.7, textTransform: "uppercase" }}>
                  Downloadable resources
                </div>
                <button
                  type="button"
                  onClick={() => setMany(allDownloadableKeys, !allDownloadableKeys.every((key) => selected.has(key)))}
                  style={{ border: "none", background: "none", color: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {allDownloadableKeys.every((key) => selected.has(key)) ? "Clear all" : "Select all"}
                </button>
              </div>
              {downloadable.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0 16px" }}>No downloadable resources yet.</div>
              ) : (
                downloadable.map((category) => {
                  const keys = category.resources.map((resource) => itemKey("downloadable", String(resource.id)));
                  const allOn = keys.length > 0 && keys.every((key) => selected.has(key));
                  return (
                    <div key={category.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f8fafc" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: category.color || "#004aad" }}>{category.title}</span>
                        {keys.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMany(keys, !allOn)}
                            style={{ border: "none", background: "none", color: "#004aad", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            {allOn ? "Clear" : "Include all"}
                          </button>
                        )}
                      </div>
                      {category.resources.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#94a3b8", padding: "10px 12px" }}>No files in this category.</div>
                      ) : (
                        category.resources.map((resource) => (
                          <CheckRow
                            key={resource.id}
                            checked={selected.has(itemKey("downloadable", String(resource.id)))}
                            title={resource.title}
                            hint={[resource.format, resource.size].filter(Boolean).join(" · ")}
                            onChange={(on) => toggle(itemKey("downloadable", String(resource.id)), on)}
                          />
                        ))
                      )}
                    </div>
                  );
                })
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 8px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.7, textTransform: "uppercase" }}>
                  Export resources
                </div>
                <button
                  type="button"
                  onClick={() => setMany(allExportKeys, !allExportKeys.every((key) => selected.has(key)))}
                  style={{ border: "none", background: "none", color: "#004aad", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {allExportKeys.every((key) => selected.has(key)) ? "Clear all" : "Select all"}
                </button>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                {exports.map((item) => (
                  <CheckRow
                    key={item.key}
                    checked={selected.has(itemKey("export", item.key))}
                    title={item.label}
                    hint={item.description}
                    onChange={(on) => toggle(itemKey("export", item.key), on)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{ margin: "0 20px 8px", padding: "10px 12px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saving || loading}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: 13, cursor: "pointer" }}
          >
            Turn off
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving || loading}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "none",
                background: "#004aad",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
