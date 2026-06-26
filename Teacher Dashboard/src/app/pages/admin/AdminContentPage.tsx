import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "./AdminLayout";
import {
  Upload, Search, Filter, FileText, BookOpen, Download,
  Trash2, Edit2, X, Plus, File, Image, Loader2, Presentation, Eye,
} from "lucide-react";
import { contentApi, type LibraryContentItem } from "../../api/client";
import { AdminPedagogicalUnitsPanel } from "./AdminPedagogicalUnitsPanel";

type ContentType = "Sheet" | "PDF" | "Lesson" | "Assessment" | "Resource" | "PowerPoint";

const typeIcons: Record<ContentType, typeof FileText> = {
  "Sheet": FileText, "PDF": File,
  "Lesson": BookOpen, "Assessment": FileText, "Resource": Image,
  "PowerPoint": Presentation,
};

const typeColors: Record<ContentType, { bg: string; color: string }> = {
  "Sheet": { bg: "#ecfdf5", color: "#059669" },
  "PDF": { bg: "#fef3c7", color: "#d97706" },
  "Lesson": { bg: "#f3f0ff", color: "#7c3aed" },
  "Assessment": { bg: "#fff1f2", color: "#e11d48" },
  "Resource": { bg: "#f0fdf4", color: "#16a34a" },
  "PowerPoint": { bg: "#fff7ed", color: "#ea580c" },
};

const types: ContentType[] = ["Sheet", "PDF", "Lesson", "Assessment", "Resource", "PowerPoint"];

function normalizeContentType(type: string): ContentType {
  return types.includes(type as ContentType) ? (type as ContentType) : "Sheet";
}

const ALLOWED_EXTENSIONS = ["pdf", "zip", "doc", "docx", "ppt", "pptx"];

function extensionType(ext: string): ContentType | null {
  if (ext === "ppt" || ext === "pptx") return "PowerPoint";
  if (ext === "pdf") return "PDF";
  return null;
}

function supportsInteractiveViewFormat(format: string) {
  return ["pdf", "ppt", "pptx"].includes(format.toLowerCase());
}

function InteractiveViewCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fafbfc",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "#004aad" }}
      />
      <span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block" }}>
          Interactive view
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
          Allow teachers to open this file in the browser. Leave unchecked for download only.
        </span>
      </span>
    </label>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: (item: LibraryContentItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    type: "PDF" as ContentType,
    unit: "General",
    atelier: 0,
    interactive_view: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileExt, setFileExt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    const allowed = ALLOWED_EXTENSIONS;
    const ext = picked.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      setError("Only PDF, ZIP, DOCX, PPT, and PPTX files are allowed.");
      return;
    }
    if (picked.size > 50 * 1024 * 1024) {
      setError("File must be 50 MB or smaller.");
      return;
    }
    setError("");
    setFile(picked);
    setFileExt(ext);
    const detectedType = extensionType(ext);
    setForm((f) => ({
      ...f,
      ...(detectedType ? { type: detectedType } : {}),
      interactive_view: supportsInteractiveViewFormat(ext),
      title: f.title || picked.name.replace(/\.[^.]+$/, ""),
    }));
  };

  const handleUpload = async () => {
    if (!form.title.trim()) {
      setError("Please enter a content title.");
      return;
    }
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("type", form.type);
      formData.append("unit", form.unit);
      formData.append("atelier", String(form.atelier));
      formData.append("interactive_view", form.interactive_view ? "1" : "0");
      formData.append("file", file);

      const { content } = await contentApi.upload(formData);
      onUploaded(content);
      toast.success("Content uploaded!", {
        description: `"${content.title}" has been added to the library.`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>Upload Content</h2>
          <button onClick={onClose} disabled={uploading} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.zip,.doc,.docx,.ppt,.pptx"
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <div
            style={{ border: `2px dashed ${file ? "#004aad" : "#e2e8f0"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", background: "#fafbfc", cursor: "pointer" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            {file ? (
              <>
                <p style={{ fontSize: 13, color: "#004aad", fontWeight: 600, margin: 0 }}>{file.name}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Drag and drop a file here or <span style={{ color: "#004aad", fontWeight: 600 }}>browse</span>
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>PDF, ZIP, DOCX, PPT, PPTX — max 50 MB</p>
              </>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Content Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Unit 1 — Student Sheet B"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContentType }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                <option>General</option>
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>Unit {i + 1}</option>)}
              </select>
            </div>
          </div>
          <InteractiveViewCheckbox
            checked={form.interactive_view}
            disabled={!file || !supportsInteractiveViewFormat(fileExt)}
            onChange={(interactive_view) => setForm((f) => ({ ...f, interactive_view }))}
          />
          {error && (
            <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {uploading && <Loader2 size={14} className="animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: LibraryContentItem;
  onClose: () => void;
  onSaved: (item: LibraryContentItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: item.title,
    type: normalizeContentType(item.type),
    unit: item.unit,
    atelier: item.atelier,
    interactive_view: item.interactive_view,
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileExt, setFileExt] = useState(item.format.toLowerCase());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    const allowed = ALLOWED_EXTENSIONS;
    const ext = picked.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      setError("Only PDF, ZIP, DOCX, PPT, and PPTX files are allowed.");
      return;
    }
    if (picked.size > 50 * 1024 * 1024) {
      setError("File must be 50 MB or smaller.");
      return;
    }
    setError("");
    setFile(picked);
    setFileExt(ext);
    const detectedType = extensionType(ext);
    setForm((f) => ({
      ...f,
      ...(detectedType ? { type: detectedType } : {}),
      interactive_view: supportsInteractiveViewFormat(ext),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please enter a content title.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("type", form.type);
      formData.append("unit", form.unit);
      formData.append("atelier", String(form.atelier));
      formData.append("interactive_view", form.interactive_view ? "1" : "0");
      if (file) {
        formData.append("file", file);
      }

      const { content } = await contentApi.update(item.id, formData);
      onSaved(content);
      toast.success("Content updated!", {
        description: `"${content.title}" has been saved.`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>Edit Content</h2>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.zip,.doc,.docx,.ppt,.pptx"
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <div
            style={{ border: `2px dashed ${file ? "#004aad" : "#e2e8f0"}`, borderRadius: 10, padding: "20px", textAlign: "center", background: "#fafbfc", cursor: "pointer" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} color="#94a3b8" style={{ margin: "0 auto 6px" }} />
            {file ? (
              <>
                <p style={{ fontSize: 13, color: "#004aad", fontWeight: 600, margin: 0 }}>{file.name}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>{formatFileSize(file.size)} — will replace current file</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                  Current: <strong>{item.format}</strong> • {item.size}
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>
                  Drop a new file or <span style={{ color: "#004aad", fontWeight: 600 }}>browse</span> to replace (optional)
                </p>
              </>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Content Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContentType }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                <option>General</option>
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>Unit {i + 1}</option>)}
              </select>
            </div>
          </div>
          <InteractiveViewCheckbox
            checked={form.interactive_view}
            disabled={!supportsInteractiveViewFormat(fileExt)}
            onChange={(interactive_view) => setForm((f) => ({ ...f, interactive_view }))}
          />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Atelier #</label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.atelier}
              onChange={(e) => setForm((f) => ({ ...f, atelier: Number(e.target.value) || 0 }))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {error && (
            <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"files" | "units">("files");
  const [content, setContent] = useState<LibraryContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [unitFilter, setUnitFilter] = useState("All Units");
  const [showUpload, setShowUpload] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryContentItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { contents } = await contentApi.list();
      setContent(contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content library.");
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const filtered = content.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All Types" || c.type === typeFilter;
    const matchUnit = unitFilter === "All Units" || c.unit === unitFilter;
    return matchSearch && matchType && matchUnit;
  });

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this resource from the library?")) return;
    setDeletingId(id);
    try {
      await contentApi.remove(id);
      setContent((prev) => prev.filter((c) => c.id !== id));
      toast.success("Content deleted", {
        description: "The resource has been removed from the library.",
      });
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Could not delete content.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const typeCounts = types.reduce(
    (acc, t) => ({ ...acc, [t]: content.filter((c) => c.type === t).length }),
    {} as Record<string, number>
  );

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["files", "units"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: activeTab === tab ? "#004aad" : "#f1f5f9",
                color: activeTab === tab ? "white" : "#64748b",
              }}
            >
              {tab === "files" ? "File Library" : "Pedagogical Units"}
            </button>
          ))}
        </div>

        {activeTab === "units" ? (
          <AdminPedagogicalUnitsPanel />
        ) : (
        <>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Content Library</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {loading ? "Loading…" : `${content.length} educational resources`}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Upload size={15} /> Upload
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
            {error}
            <button onClick={loadContent} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
              Retry
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {types.map((t) => {
            const tc = typeColors[t];
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(active ? "All Types" : t)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? tc.color : "#e2e8f0"}`,
                  background: active ? tc.bg : "white", color: active ? tc.color : "#64748b",
                  fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span>{t}</span>
                <span style={{ background: active ? tc.color : "#e2e8f0", color: active ? "white" : "#94a3b8", borderRadius: 10, padding: "0px 6px", fontSize: 10, fontWeight: 700 }}>
                  {typeCounts[t] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in library..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <Filter size={13} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              style={{ padding: "9px 32px 9px 30px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}
            >
              <option>All Units</option>
              <option>General</option>
              {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>Unit {i + 1}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={18} className="animate-spin" /> Loading content library…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map((c) => {
              const tc = typeColors[c.type as ContentType] ?? typeColors.PDF;
              const IconComp = typeIcons[c.type as ContentType] ?? FileText;
              return (
                <div
                  key={c.id}
                  style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ background: tc.bg, borderRadius: 8, padding: 9 }}>
                      <IconComp size={16} color={tc.color} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: tc.bg, color: tc.color }}>{c.type}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.4, marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.unit}{c.atelier > 0 ? ` • Atelier ${c.atelier}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #f8fafc" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.format} • {c.size} • {c.uploaded}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.is_viewable && (
                        <a
                          href={`/library/content/${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #dbeafe", background: "#eff6ff", cursor: "pointer", display: "flex", alignItems: "center", textDecoration: "none" }}
                          title="Preview"
                        >
                          <Eye size={12} color="#3b82f6" />
                        </a>
                      )}
                      {c.has_file && (
                        <a
                          href={contentApi.downloadUrl(c.id)}
                          download
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", textDecoration: "none" }}
                        >
                          <Download size={12} color="#64748b" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditingItem(c)}
                        style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <Edit2 size={12} color="#64748b" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        {deletingId === c.id ? <Loader2 size={12} color="#ef4444" className="animate-spin" /> : <Trash2 size={12} color="#ef4444" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setShowUpload(true)}
              style={{
                background: "white", borderRadius: 12, padding: "18px 20px", border: "2px dashed #e2e8f0",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 140,
              }}
            >
              <Plus size={20} color="#94a3b8" />
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Add Content</span>
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && content.length > 0 && !error && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            No content matching filters.
          </div>
        )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(item) => setContent((prev) => [item, ...prev])}
        />
      )}

      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={(updated) =>
            setContent((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
          }
        />
      )}
        </>
        )}
      </div>
    </AdminLayout>
  );
}
