import { useState } from "react";
import { ChevronDown, Loader2, Plus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminSchoolYear, suggestNextSchoolYear } from "../../context/AdminSchoolYearContext";

const ADD_NEW_VALUE = "__add_new__";

export function AdminSchoolYearSelector() {
  const {
    years,
    defaultLabel,
    selectedYear,
    setSelectedYear,
    loading,
    addYear,
    makeDefault,
  } = useAdminSchoolYear();

  const [modalOpen, setModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedRecord = years.find((y) => y.label === selectedYear);

  const openAddModal = () => {
    setNewLabel(suggestNextSchoolYear(years));
    setSetAsDefault(true);
    setModalOpen(true);
  };

  const handleSelectChange = (value: string) => {
    if (value === ADD_NEW_VALUE) {
      openAddModal();
      return;
    }
    setSelectedYear(value);
  };

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!/^\d{4}-\d{4}$/.test(label)) {
      toast.error("Enter a valid school year (e.g. 2026-2027).");
      return;
    }

    const start = parseInt(label.slice(0, 4), 10);
    const end = parseInt(label.slice(5, 9), 10);
    if (end !== start + 1) {
      toast.error("The end year must be exactly one year after the start year.");
      return;
    }

    setSaving(true);
    try {
      await addYear(label, setAsDefault);
      setModalOpen(false);
      toast.success(setAsDefault ? "School year added and set as default." : "School year added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add school year.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedRecord || selectedRecord.is_default) return;
    try {
      await makeDefault(selectedRecord.id);
      toast.success(`${selectedRecord.label} is now the default school year.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set default school year.");
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
          School year:
        </span>
        <div style={{ position: "relative" }}>
          <select
            value={selectedYear}
            onChange={(e) => handleSelectChange(e.target.value)}
            disabled={loading}
            style={{
              padding: "8px 34px 8px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              fontSize: 13,
              color: "#374151",
              cursor: loading ? "wait" : "pointer",
              outline: "none",
              minWidth: 160,
              appearance: "none",
            }}
          >
            {years.map((year) => (
              <option key={year.id} value={year.label}>
                {year.label}{year.is_default ? " (default)" : ""}
              </option>
            ))}
            <option value={ADD_NEW_VALUE}>+ Add new school year…</option>
          </select>
          {loading ? (
            <Loader2
              size={14}
              className="animate-spin"
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
          ) : (
            <ChevronDown
              size={14}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}
            />
          )}
        </div>
        {selectedRecord && !selectedRecord.is_default && (
          <button
            type="button"
            onClick={handleSetDefault}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #dbeafe",
              background: "#eff6ff",
              color: "#004aad",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Star size={13} />
            Set as default
          </button>
        )}
        {defaultLabel && selectedYear === defaultLabel && (
          <span style={{ fontSize: 11, color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>
            Default for new records
          </span>
        )}
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,22,40,0.55)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => e.target === e.currentTarget && !saving && setModalOpen(false)}
        >
          <div style={{
            background: "white",
            borderRadius: 14,
            width: 420,
            maxWidth: "92vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={18} color="#004aad" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a1628" }}>Add new school year</h2>
              </div>
              <button type="button" onClick={() => !saving && setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                School year
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="2026-2027"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  style={{ accentColor: "#004aad" }}
                />
                <span style={{ fontSize: 13, color: "#374151" }}>Set as default school year</span>
              </label>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, lineHeight: 1.5 }}>
                The default school year is used when creating new classes and pre-fills portal views.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px 18px", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}
              >
                {saving ? "Adding…" : "Add school year"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
