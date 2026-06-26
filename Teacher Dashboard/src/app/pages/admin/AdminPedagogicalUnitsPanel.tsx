import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Loader2, BookOpen, Download, Upload, ChevronDown, ChevronUp,
} from "lucide-react";
import { unitsApi, type PedagogicalUnitItem } from "../../api/client";

const PRESET_COLORS = [
  { bg: "#3b82f6", text: "#ffffff" },
  { bg: "#38bdf8", text: "#000000" },
  { bg: "#22d3ee", text: "#000000" },
  { bg: "#a3e635", text: "#000000" },
  { bg: "#fbbf24", text: "#000000" },
  { bg: "#fb923c", text: "#000000" },
  { bg: "#fb7185", text: "#000000" },
  { bg: "#a855f7", text: "#ffffff" },
  { bg: "#0ea5e9", text: "#ffffff" },
  { bg: "#ef4444", text: "#ffffff" },
];

function formatAtelierLabel(numbers: number[]): string {
  if (numbers.length === 0) return "";
  if (numbers.length === 1) return `Atelier ${numbers[0]}`;
  return `Ateliers ${numbers.join(", ")}`;
}

function UnitFormModal({
  unit,
  onClose,
  onSaved,
}: {
  unit: PedagogicalUnitItem | null;
  onClose: () => void;
  onSaved: (unit: PedagogicalUnitItem) => void;
}) {
  const quickSheetRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: unit?.title ?? "",
    description: unit?.description ?? "",
    color: unit?.color ?? PRESET_COLORS[0].bg,
    text_color: unit?.text_color ?? PRESET_COLORS[0].text,
    atelier_numbers: (unit?.atelier_numbers ?? []).join(", "),
    lesson_count: unit?.lesson_count ?? 8,
  });
  const [quickSheet, setQuickSheet] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [currentUnit, setCurrentUnit] = useState<PedagogicalUnitItem | null>(unit);
  const [uploadingLesson, setUploadingLesson] = useState<number | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<{ lesson: number; field: "interactive" | "activity_sheet" } | null>(null);

  const uploadedFileStyle = {
    background: "#ecfdf5",
    border: "1px solid #86efac",
    color: "#065f46",
  };

  const emptyFileStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#374151",
  };

  const interactiveRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const activityRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please enter a unit title.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("color", form.color);
      formData.append("text_color", form.text_color);
      formData.append("lesson_count", String(form.lesson_count));

      const atelierNums = form.atelier_numbers
        .split(/[,\s]+/)
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      formData.append("atelier_numbers", JSON.stringify(atelierNums));

      if (quickSheet) {
        formData.append("quick_sheet", quickSheet);
      }

      const { unit: saved } = unit
        ? await unitsApi.update(unit.id, formData)
        : await unitsApi.create(formData);

      setCurrentUnit(saved);
      onSaved(saved);
      if (unit) {
        toast.success("Unit updated!", {
          description: `"${saved.title}" has been saved successfully.`,
        });
      } else {
        toast.success("Unit created!", {
          description: `"${saved.title}" has been added to the library.`,
        });
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      toast.error(unit ? "Update failed" : "Create failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadLessonFile = async (
    lessonNumber: number,
    field: "interactive" | "activity_sheet",
    file: File
  ) => {
    if (!currentUnit) return;
    setUploadingLesson(lessonNumber);
    setError("");
    try {
      const formData = new FormData();
      formData.append(field, file);
      const { unit: updated } = await unitsApi.updateLesson(currentUnit.id, lessonNumber, formData);
      setCurrentUnit(updated);
      onSaved(updated);
      toast.success("File uploaded!", {
        description: field === "interactive"
          ? `Interactive lesson for Lesson ${lessonNumber} is ready.`
          : `Activity sheet for Lesson ${lessonNumber} is ready.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploadingLesson(null);
    }
  };

  const deleteLessonFile = async (
    lessonNumber: number,
    field: "interactive" | "activity_sheet"
  ) => {
    if (!currentUnit) return;
    const label = field === "interactive" ? "interactive lesson" : "activity sheet";
    if (!window.confirm(`Remove the ${label} for Lesson ${lessonNumber}?`)) return;

    setDeletingLesson({ lesson: lessonNumber, field });
    setError("");
    try {
      const formData = new FormData();
      formData.append(field === "interactive" ? "remove_interactive" : "remove_activity_sheet", "1");
      const { unit: updated } = await unitsApi.updateLesson(currentUnit.id, lessonNumber, formData);
      setCurrentUnit(updated);
      onSaved(updated);
      toast.success("File removed", {
        description: `You can upload a new ${label} for Lesson ${lessonNumber}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeletingLesson(null);
    }
  };

  const lessons = currentUnit?.lessons ?? Array.from({ length: form.lesson_count }, (_, i) => ({
    lesson_number: i + 1,
    has_interactive: false,
    has_activity_sheet: false,
    interactive_format: null,
    activity_sheet_format: null,
    is_interactive_viewable: false,
  }));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: "min(640px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>
            {unit ? "Edit Unit" : "Add Unit"}
          </h2>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Unit 1"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g., Phonological awareness and syllables"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Number of lessons</label>
              <input
                type="number"
                min={0}
                max={50}
                value={form.lesson_count}
                onChange={(e) => setForm((f) => ({ ...f, lesson_count: parseInt(e.target.value, 10) || 0 }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Atelier numbers</label>
              <input
                value={form.atelier_numbers}
                onChange={(e) => setForm((f) => ({ ...f, atelier_numbers: e.target.value }))}
                placeholder="e.g., 1, 2, 3, 4, 5, 6"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Theme color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.bg}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.bg, text_color: c.text }))}
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: c.bg, cursor: "pointer",
                    border: form.color === c.bg ? "3px solid #0a1628" : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Quick sheet (optional)</label>
            <input ref={quickSheetRef} type="file" accept=".pdf,.zip,.doc,.docx,.ppt,.pptx" style={{ display: "none" }}
              onChange={(e) => setQuickSheet(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => quickSheetRef.current?.click()}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px dashed #e2e8f0", background: "#fafbfc", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Upload size={14} />
              {quickSheet ? quickSheet.name : currentUnit?.has_quick_sheet ? `Current: ${currentUnit.quick_sheet_format}` : "Upload quick sheet"}
            </button>
          </div>

          {currentUnit && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                Lessons ({lessons.length})
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {lessons.map((lesson) => {
                  const open = expandedLesson === lesson.lesson_number;
                  const hasAnyFile = lesson.has_interactive || lesson.has_activity_sheet;
                  const isBusy = uploadingLesson === lesson.lesson_number;
                  return (
                    <div key={lesson.lesson_number} style={{ border: `1px solid ${hasAnyFile ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLesson(open ? null : lesson.lesson_number)}
                        style={{
                          width: "100%", padding: "10px 12px",
                          background: hasAnyFile ? "#ecfdf5" : "#fafbfc",
                          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                          fontSize: 13, fontWeight: 600, color: hasAnyFile ? "#065f46" : "#374151",
                        }}
                      >
                        <span>Lesson {lesson.lesson_number}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {lesson.has_interactive && <span style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>Interactive ✓</span>}
                          {lesson.has_activity_sheet && <span style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>Sheet ✓</span>}
                          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </button>
                      {open && (
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "#f8fffb" }}>
                          <input
                            ref={(el) => { interactiveRefs.current[lesson.lesson_number] = el; }}
                            type="file"
                            accept=".pdf,.ppt,.pptx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadLessonFile(lesson.lesson_number, "interactive", file);
                              e.target.value = "";
                            }}
                          />
                          <input
                            ref={(el) => { activityRefs.current[lesson.lesson_number] = el; }}
                            type="file"
                            accept=".pdf,.zip,.doc,.docx,.ppt,.pptx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadLessonFile(lesson.lesson_number, "activity_sheet", file);
                              e.target.value = "";
                            }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              disabled={isBusy || deletingLesson !== null}
                              onClick={() => interactiveRefs.current[lesson.lesson_number]?.click()}
                              style={{
                                flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", textAlign: "left",
                                ...(lesson.has_interactive ? uploadedFileStyle : emptyFileStyle),
                              }}
                            >
                              {isBusy ? "Uploading…" : lesson.has_interactive ? `Interactive: ${lesson.interactive_format}` : "Upload interactive lesson"}
                            </button>
                            {lesson.has_interactive && (
                              <button
                                type="button"
                                title="Remove interactive lesson"
                                disabled={deletingLesson !== null || isBusy}
                                onClick={() => deleteLessonFile(lesson.lesson_number, "interactive")}
                                style={{
                                  padding: "8px 10px", borderRadius: 6, border: "1px solid #fecaca",
                                  background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center",
                                }}
                              >
                                {deletingLesson?.lesson === lesson.lesson_number && deletingLesson.field === "interactive"
                                  ? <Loader2 size={14} color="#ef4444" className="animate-spin" />
                                  : <Trash2 size={14} color="#ef4444" />}
                              </button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              disabled={isBusy || deletingLesson !== null}
                              onClick={() => activityRefs.current[lesson.lesson_number]?.click()}
                              style={{
                                flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", textAlign: "left",
                                ...(lesson.has_activity_sheet ? uploadedFileStyle : emptyFileStyle),
                              }}
                            >
                              {isBusy ? "Uploading…" : lesson.has_activity_sheet ? `Activity sheet: ${lesson.activity_sheet_format}` : "Upload activity sheet"}
                            </button>
                            {lesson.has_activity_sheet && (
                              <button
                                type="button"
                                title="Remove activity sheet"
                                disabled={deletingLesson !== null || isBusy}
                                onClick={() => deleteLessonFile(lesson.lesson_number, "activity_sheet")}
                                style={{
                                  padding: "8px 10px", borderRadius: 6, border: "1px solid #fecaca",
                                  background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center",
                                }}
                              >
                                {deletingLesson?.lesson === lesson.lesson_number && deletingLesson.field === "activity_sheet"
                                  ? <Loader2 size={14} color="#ef4444" className="animate-spin" />
                                  : <Trash2 size={14} color="#ef4444" />}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>
                Save the unit first, then expand each lesson to upload files.
              </p>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {unit ? "Save Changes" : "Create Unit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPedagogicalUnitsPanel() {
  const [units, setUnits] = useState<PedagogicalUnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUnit, setEditingUnit] = useState<PedagogicalUnitItem | null | "new">(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { units: data } = await unitsApi.list();
      setUnits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load units.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this unit and all its lessons?")) return;
    setDeletingId(id);
    try {
      await unitsApi.remove(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
      toast.success("Unit deleted", {
        description: "The unit has been removed from the library.",
      });
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Could not delete unit.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = async (unit: PedagogicalUnitItem) => {
    try {
      const { unit: full } = await unitsApi.get(unit.id);
      setEditingUnit(full);
    } catch {
      setEditingUnit(unit);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0a1628", margin: 0 }}>Pedagogical Units</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Manage units shown in the teacher library — lessons, quick sheets, and atelier assignments.
          </p>
        </div>
        <button
          onClick={() => setEditingUnit("new")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={15} /> Add Unit
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
          {error}
          <button onClick={loadUnits} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#be123c" }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={18} className="animate-spin" /> Loading units…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {units.map((unit) => (
            <div
              key={unit.id}
              style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ background: `${unit.color}20`, borderRadius: 8, padding: 9 }}>
                  <BookOpen size={16} color={unit.color} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => openEdit(unit)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}>
                    <Edit2 size={12} color="#64748b" />
                  </button>
                  <button
                    onClick={() => handleDelete(unit.id)}
                    disabled={deletingId === unit.id}
                    style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer" }}
                  >
                    {deletingId === unit.id ? <Loader2 size={12} color="#ef4444" className="animate-spin" /> : <Trash2 size={12} color="#ef4444" />}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{unit.title}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{unit.description}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#f1f5f9", color: "#64748b" }}>
                  {unit.lesson_count} lessons
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#f7ffd6", color: "#004aad" }}>
                  {formatAtelierLabel(unit.atelier_numbers)}
                </span>
                {unit.has_quick_sheet && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#eff6ff", color: "#3b82f6" }}>
                    Quick sheet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUnit !== null && (
        <UnitFormModal
          unit={editingUnit === "new" ? null : editingUnit}
          onClose={() => setEditingUnit(null)}
          onSaved={(saved) => {
            setUnits((prev) => {
              const exists = prev.some((u) => u.id === saved.id);
              return exists ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
            });
            if (editingUnit === "new") setEditingUnit(saved);
          }}
        />
      )}
    </div>
  );
}
