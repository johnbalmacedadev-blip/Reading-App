import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, HelpCircle, LayoutTemplate, ListChecks, RotateCcw, Save } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useLanguage } from "../../i18n";
import {
  WORKSHOP_TEMPLATES,
  type WorkshopTemplate,
  type WorkshopTemplateId,
  type TemplateDraft,
  buildTemplateDrafts,
  defaultTemplateDraft,
  resolveTemplateName,
  saveTemplateDrafts,
  templateDraftsEqual,
} from "../../evaluation/workshopTemplates";
import { WorkshopTemplatePreview } from "../../components/WorkshopTemplatePreview";

function templateFormatLabel(format: (typeof WORKSHOP_TEMPLATES)[number]["format"]): string {
  if (format === "letter_grid") return "Letter grid";
  if (format === "word_sound_list") return "Sound identification";
  if (format === "mixed_sections") return "Syllable & grapheme";
  if (format === "item_grid_sections") return "Reading grids";
  if (format === "mixed_reading_sections") return "Word families & reading";
  if (format === "fluency_sections") return "Fluency & decoding";
  if (format === "comprehension_sections") return "Listening comprehension";
  if (format === "multiple_choice") return "Multiple choice";
  return "Section checklists";
}

function templateItemCount(template: WorkshopTemplate): { count: number; label: "section" | "question" } {
  if (template.format === "multiple_choice") {
    return { count: template.questions.length, label: "question" };
  }
  return { count: template.sections.length, label: "section" };
}

export function AdminTemplatesPage() {
  const { tp, t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const initial = useMemo(() => buildTemplateDrafts(), []);
  const [savedDrafts, setSavedDrafts] = useState(initial);
  const [drafts, setDrafts] = useState(initial);
  const [justSavedId, setJustSavedId] = useState<WorkshopTemplateId | null>(null);

  const updateDraft = useCallback((id: WorkshopTemplateId, draft: TemplateDraft) => {
    setJustSavedId(null);
    setDrafts((prev) => ({ ...prev, [id]: draft }));
  }, []);

  const saveDraft = useCallback((id: WorkshopTemplateId) => {
    const draftToSave = drafts[id] ?? defaultTemplateDraft(id);
    setSavedDrafts((prev) => {
      const next = { ...prev, [id]: draftToSave };
      saveTemplateDrafts(next);
      return next;
    });
    setJustSavedId(id);
    window.setTimeout(() => setJustSavedId((current) => (current === id ? null : current)), 2000);
  }, [drafts]);

  const resetDraft = useCallback((id: WorkshopTemplateId) => {
    setJustSavedId(null);
    setDrafts((prev) => ({ ...prev, [id]: defaultTemplateDraft(id) }));
  }, []);

  const templates = useMemo(() => WORKSHOP_TEMPLATES, []);

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Templates</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Reusable workshop form layouts based on the live evaluation forms.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {templates.map((template) => {
            const expanded = expandedId === template.id;
            const templateDraft = drafts[template.id] ?? defaultTemplateDraft(template.id);
            const savedDraft = savedDrafts[template.id] ?? defaultTemplateDraft(template.id);
            const defaultDraft = defaultTemplateDraft(template.id);
            const isDirty = !templateDraftsEqual(templateDraft, savedDraft);
            const isDefaultDraft = templateDraftsEqual(templateDraft, defaultDraft);
            const showSaved = justSavedId === template.id;
            const itemMeta = templateItemCount(template);
            const displayName = resolveTemplateName(
              template.id,
              expanded ? templateDraft : savedDraft
            );

            return (
              <div
                key={template.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : template.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "18px 20px",
                    border: "none",
                    background: "white",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: "#dff3ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {template.format === "letter_grid" ? (
                      <LayoutTemplate size={18} color="#004aad" />
                    ) : template.format === "word_sound_list" ? (
                      <ListChecks size={18} color="#004aad" />
                    ) : template.format === "multiple_choice" ? (
                      <HelpCircle size={18} color="#004aad" />
                    ) : (
                      <FileText size={18} color="#004aad" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                      {template.description}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 12,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                        }}
                      >
                        {templateFormatLabel(template.format)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 12,
                          background: "#f8fafc",
                          color: "#64748b",
                        }}
                      >
                        {itemMeta.count} {itemMeta.label}
                        {itemMeta.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronDown size={18} color="#94a3b8" />
                  ) : (
                    <ChevronRight size={18} color="#94a3b8" />
                  )}
                </button>

                {expanded && (
                  <div
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      padding: "20px 24px 24px",
                      background: "#f8fbff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            marginBottom: 6,
                          }}
                        >
                          Template name
                        </label>
                        <input
                          value={templateDraft.name ?? defaultDraft.name}
                          onChange={(e) =>
                            updateDraft(template.id, { ...templateDraft, name: e.target.value })
                          }
                          placeholder={defaultDraft.name}
                          style={{
                            width: "100%",
                            maxWidth: 420,
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0a1628",
                            outline: "none",
                            boxSizing: "border-box",
                            background: "white",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 22 }}>
                        {isDirty && (
                          <>
                            {!isDefaultDraft && (
                              <button
                                type="button"
                                onClick={() => resetDraft(template.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "white",
                                  color: "#64748b",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                <RotateCcw size={13} />
                                Reset
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => saveDraft(template.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: "none",
                                background: "#004aad",
                                color: "white",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Save size={13} />
                              {t("common.save")}
                            </button>
                          </>
                        )}
                        {showSaved && !isDirty && (
                          <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                            Saved
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                        {template.format === "multiple_choice" ? (
                          <>Multiple choice questionnaire preview.</>
                        ) : (
                          <>
                            Preview based on{" "}
                            <strong style={{ color: "#334155" }}>
                              {tp("evaluation.workshopN", { n: template.sourceWorkshop })}
                            </strong>{" "}
                            evaluation form structure.
                          </>
                        )}
                      </p>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: 16,
                        padding: 24,
                        border: "1px solid #dff3ff",
                      }}
                    >
                      <WorkshopTemplatePreview
                        template={template}
                        draft={templateDraft}
                        onDraftChange={(draft) => updateDraft(template.id, draft)}
                        editable
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
