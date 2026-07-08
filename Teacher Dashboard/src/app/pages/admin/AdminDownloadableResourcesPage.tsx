import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Edit2, FileText, Loader2, Save, Trash2, Upload, X,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import {
  downloadableApi,
  type DownloadableCategoryItem,
  type DownloadableResourceItem,
} from "../../api/client";

const PRESET_COLORS = [
  "#3b82f6", "#38bdf8", "#22d3ee", "#a3e635", "#fbbf24",
  "#fb923c", "#fb7185", "#a855f7", "#0ea5e9", "#ef4444",
];

function ResourceRow({
  resource,
  color,
  onUpdated,
  onDeleted,
}: {
  resource: DownloadableResourceItem;
  color: string;
  onUpdated: (resource: DownloadableResourceItem) => void;
  onDeleted: (id: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleReplace = async (file: File) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim() || resource.title);
      formData.append("file", file);
      const { resource: updated } = await downloadableApi.updateResource(resource.id, formData);
      onUpdated(updated);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      const { resource: updated } = await downloadableApi.updateResource(resource.id, formData);
      onUpdated(updated);
      setEditing(false);
      toast.success("Title updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${resource.title}"?`)) return;
    setDeleting(true);
    try {
      await downloadableApi.removeResource(resource.id);
      onDeleted(resource.id);
      toast.success("Resource deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        background: "#fff",
        border: `1px solid ${color}25`,
      }}
    >
      <FileText size={16} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{resource.title}</div>
        )}
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
          {resource.has_file
            ? `${resource.format ?? "PDF"} • ${resource.size}`
            : "No file uploaded yet"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {resource.has_file && (
          <a
            href={downloadableApi.downloadUrl(resource.id)}
            download
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
            title="Download"
          >
            <Download size={14} color="#64748b" />
          </a>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.zip,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReplace(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border: `1px solid ${color}40`,
            background: `${color}10`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          title={resource.has_file ? "Replace file" : "Upload file"}
        >
          {saving ? <Loader2 size={14} className="animate-spin" color={color} /> : <Upload size={14} color={color} />}
        </button>
        {editing ? (
          <button
            onClick={handleSaveTitle}
            disabled={saving}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "none",
              background: "#004aad",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Save size={14} color="#fff" />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Edit2 size={14} color="#64748b" />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {deleting ? <Loader2 size={14} className="animate-spin" color="#ef4444" /> : <Trash2 size={14} color="#ef4444" />}
        </button>
      </div>
    </div>
  );
}

export function AdminDownloadableResourcesPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<DownloadableCategoryItem[]>([]);
  const [category, setCategory] = useState<DownloadableCategoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [settings, setSettings] = useState({ title: "", color: "#3b82f6" });

  const loadCategories = useCallback(() => {
    return downloadableApi.listCategories().then(({ categories: data }) => {
      setCategories(data);
      return data;
    });
  }, []);

  const loadCategory = useCallback((id: number) => {
    return downloadableApi.getCategory(id).then(({ category: data }) => {
      setCategory(data);
      setSettings({ title: data.title, color: data.color });
      return data;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const id = Number(categoryId);
    if (id) {
      loadCategory(id)
        .catch(() => setCategory(null))
        .finally(() => setLoading(false));
    } else {
      loadCategories()
        .catch(() => setCategories([]))
        .finally(() => setLoading(false));
    }
  }, [categoryId, loadCategories, loadCategory]);

  const handleSaveSettings = async () => {
    if (!category || !settings.title.trim()) return;
    setSaving(true);
    try {
      const { category: updated } = await downloadableApi.updateCategory(category.id, {
        title: settings.title.trim(),
        color: settings.color,
      });
      setCategory(updated);
      toast.success("Category settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddResource = async () => {
    if (!category || !newTitle.trim() || !newFile) {
      toast.error("Enter a title and select a file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", newTitle.trim());
      formData.append("file", newFile);
      const { resource } = await downloadableApi.uploadResource(category.id, formData);
      setCategory((prev) =>
        prev
          ? {
              ...prev,
              resources: [...(prev.resources ?? []), resource],
              resource_count: prev.resource_count + 1,
              uploaded_count: prev.uploaded_count + 1,
            }
          : prev
      );
      setNewTitle("");
      setNewFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Resource added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 className="animate-spin" size={24} color="#004aad" />
        </div>
      </AdminLayout>
    );
  }

  if (!categoryId) {
    return (
      <AdminLayout>
        <div style={{ padding: "32px 40px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>
            Downloadable Resources
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
            Manage resource categories and upload PDF files for the teacher library.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/admin/downloadable-resources/${cat.id}`)}
                style={{
                  textAlign: "left",
                  padding: 20,
                  borderRadius: 14,
                  border: `2px solid ${cat.color}25`,
                  background: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: cat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <FileText size={18} color="#fff" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#004aad", marginBottom: 6 }}>
                  {cat.title}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {cat.uploaded_count} / {cat.resource_count} files uploaded
                </div>
              </button>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!category) {
    return (
      <AdminLayout>
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#be123c", marginBottom: 16 }}>Category not found.</p>
          <button onClick={() => navigate("/admin/downloadable-resources")} style={{ color: "#004aad" }}>
            Back to categories
          </button>
        </div>
      </AdminLayout>
    );
  }

  const resources = category.resources ?? [];

  return (
    <AdminLayout>
      <div style={{ padding: "32px 40px" }}>
        <button
          onClick={() => navigate("/admin/downloadable-resources")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "none",
            color: "#38b6ff",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          All categories
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>
              {category.title}
            </h1>
            <p style={{ fontSize: 14, color: "#64748b" }}>
              {category.uploaded_count} of {category.resource_count} resources have files
            </p>
          </div>
        </div>

        {/* Category settings */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #e2e8f0",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
            Category settings
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                Title
              </label>
              <input
                value={settings.title}
                onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                Color
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSettings((s) => ({ ...s, color: c }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c,
                      border: settings.color === c ? "2px solid #0a1628" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#004aad",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save settings
          </button>
        </div>

        {/* Add new resource */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
            border: `1px solid ${category.color}30`,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
            Upload new resource
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                Resource title
              </label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Rimes"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                PDF file
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.zip,.doc,.docx"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13 }}
              />
            </div>
            <button
              onClick={handleAddResource}
              disabled={uploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: category.color,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload
            </button>
          </div>
        </div>

        {/* Resource list */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 12 }}>
            Resources ({resources.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                color={category.color}
                onUpdated={(updated) =>
                  setCategory((prev) =>
                    prev
                      ? {
                          ...prev,
                          resources: prev.resources?.map((r) => (r.id === updated.id ? updated : r)),
                          uploaded_count: prev.resources?.filter((r) =>
                            r.id === updated.id ? updated.has_file : r.has_file
                          ).length ?? 0,
                        }
                      : prev
                  )
                }
                onDeleted={(id) =>
                  setCategory((prev) =>
                    prev
                      ? {
                          ...prev,
                          resources: prev.resources?.filter((r) => r.id !== id),
                          resource_count: prev.resource_count - 1,
                          uploaded_count: (prev.resources?.filter((r) => r.id !== id && r.has_file).length ?? 0),
                        }
                      : prev
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
