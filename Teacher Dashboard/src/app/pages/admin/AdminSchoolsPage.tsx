import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Archive, X, ChevronDown, School } from "lucide-react";

const initialSchools = [
  { id: 1, name: "École Saint-Laurent", board: "CSDM", city: "Montreal", teachers: 9, students: 218, grades: "K–2", status: "Active" },
  { id: 2, name: "École des Érables", board: "CSDM", city: "Montreal", teachers: 8, students: 192, grades: "K–2", status: "Active" },
  { id: 3, name: "École Bois-de-Coulonge", board: "CSDN", city: "Lévis", teachers: 7, students: 175, grades: "K–2", status: "Active" },
  { id: 4, name: "École des Sommets", board: "CSDN", city: "Lévis", teachers: 8, students: 188, grades: "K–2", status: "Active" },
  { id: 5, name: "École Marguerite-d'Youville", board: "CSMB", city: "Montreal", teachers: 6, students: 141, grades: "K–2", status: "Active" },
  { id: 6, name: "École du Ruisseau", board: "CSMB", city: "Dollard-des-Ormeaux", teachers: 7, students: 163, grades: "K–2", status: "Active" },
  { id: 7, name: "École des Pionniers", board: "CSPO", city: "Gatineau", teachers: 5, students: 119, grades: "K–2", status: "Active" },
  { id: 8, name: "École Bellevue", board: "CSDN", city: "Lévis", teachers: 0, students: 0, grades: "—", status: "Archived" },
];

type School = typeof initialSchools[0];

const boards = ["All Boards", "CSDM", "CSDN", "CSMB", "CSPO"];

function Modal({ title, school, onClose, onSave }: {
  title: string; school: Partial<School>;
  onClose: () => void; onSave: (s: Partial<School>) => void;
}) {
  const [form, setForm] = useState(school);
  const set = (k: keyof School, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "School Name", key: "name" as const, placeholder: "e.g., École des Érables" },
            { label: "City", key: "city" as const, placeholder: "e.g., Montreal" },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{f.label}</label>
              <input value={(form[f.key] as string) || ""} onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>School Board</label>
            <select value={form.board || "CSDM"} onChange={(e) => set("board", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}>
              {["CSDM", "CSDN", "CSMB", "CSPO"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Grade Levels</label>
            <input value={(form.grades as string) || ""} onChange={(e) => set("grades", e.target.value)}
              placeholder="e.g., K–2"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function AdminSchoolsPage() {
  const [schools, setSchools] = useState(initialSchools);
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState("All Boards");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<{ type: "create" | "edit"; school: Partial<School> } | null>(null);

  const filtered = schools.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase());
    const matchBoard = board === "All Boards" || s.board === board;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchBoard && matchStatus;
  });

  const handleSave = (data: Partial<School>) => {
    if (modal?.type === "create") {
      setSchools((prev) => [...prev, { ...data, id: Date.now(), teachers: 0, students: 0 } as School]);
    } else {
      setSchools((prev) => prev.map((s) => s.id === data.id ? { ...s, ...data } as School : s));
    }
    setModal(null);
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>Schools</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{schools.filter(s => s.status === "Active").length} active schools on the platform</p>
          </div>
          <button onClick={() => setModal({ type: "create", school: { status: "Active", board: "CSDM", grades: "K–2" } })}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> New School
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a school..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          {[{ value: board, onChange: setBoard, options: boards }, { value: statusFilter, onChange: setStatusFilter, options: ["All", "Active", "Archived"] }].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}>
                {sel.options.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["School", "Board", "City", "Grades", "Teachers", "Students", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ background: "#f0f7ff", borderRadius: 8, padding: 7 }}>
                        <School size={14} color="#38b6ff" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#dff3ff", color: "#004aad" }}>{s.board}</span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{s.city}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{s.grades}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{s.teachers}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{s.students}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: s.status === "Active" ? "#ecfdf5" : "#f8fafc", color: s.status === "Active" ? "#059669" : "#94a3b8" }}>{s.status}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setModal({ type: "edit", school: s })}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => setSchools((prev) => prev.map((x) => x.id === s.id ? { ...x, status: x.status === "Archived" ? "Active" : "Archived" } : x))}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444" }}>
                        <Archive size={12} /> {s.status === "Archived" ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No school found.</div>}
        </div>
      </div>
      {modal && (
        <Modal title={modal.type === "create" ? "New School" : "Edit School"} school={modal.school}
          onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </AdminLayout>
  );
}
