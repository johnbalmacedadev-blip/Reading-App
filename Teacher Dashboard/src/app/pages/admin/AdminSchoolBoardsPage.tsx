import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Plus, Search, Edit2, Archive, X, ChevronDown, Building2 } from "lucide-react";

const initialBoards = [
  { id: 1, name: "Montreal School Board (CSDM)", region: "Montreal", schools: 6, teachers: 48, students: 1124, status: "Active", created: "2023-08-01" },
  { id: 2, name: "Navigators School Board (CSDN)", region: "Lévis", schools: 5, teachers: 39, students: 891, status: "Active", created: "2023-08-15" },
  { id: 3, name: "Marguerite-Bourgeoys School Board (CSMB)", region: "West Montreal", schools: 4, teachers: 32, students: 742, status: "Active", created: "2024-01-10" },
  { id: 4, name: "Portages-de-l'Outaouais School Board (CSPO)", region: "Outaouais", schools: 3, teachers: 23, students: 490, status: "Active", created: "2024-03-05" },
  { id: 5, name: "Laval School Board (CSL)", region: "Laval", schools: 0, teachers: 0, students: 0, status: "Archived", created: "2022-09-01" },
];

type Board = typeof initialBoards[0];

const regions = ["All Regions", "Montreal", "Lévis", "West Montreal", "Outaouais", "Laval"];

function Modal({ title, board, onClose, onSave }: {
  title: string;
  board: Partial<Board>;
  onClose: () => void;
  onSave: (b: Partial<Board>) => void;
}) {
  const [form, setForm] = useState(board);
  const set = (k: keyof Board, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, width: 500, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Board Name", key: "name" as const, placeholder: "e.g., Montreal School Board..." },
            { label: "Region", key: "region" as const, placeholder: "e.g., Montreal" },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{f.label}</label>
              <input
                value={(form[f.key] as string) || ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Status</label>
            <select
              value={form.status || "Active"}
              onChange={(e) => set("status", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
            >
              <option>Active</option>
              <option>Archived</option>
            </select>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#004aad", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSchoolBoardsPage() {
  const [boards, setBoards] = useState(initialBoards);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<{ type: "create" | "edit"; board: Partial<Board> } | null>(null);

  const filtered = boards.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.region.toLowerCase().includes(search.toLowerCase());
    const matchRegion = region === "All Regions" || b.region === region;
    const matchStatus = statusFilter === "All" || b.status === statusFilter;
    return matchSearch && matchRegion && matchStatus;
  });

  const handleSave = (data: Partial<Board>) => {
    if (modal?.type === "create") {
      setBoards((prev) => [...prev, { ...data, id: Date.now(), schools: 0, teachers: 0, students: 0, created: new Date().toISOString().slice(0, 10) } as Board]);
    } else {
      setBoards((prev) => prev.map((b) => b.id === data.id ? { ...b, ...data } as Board : b));
    }
    setModal(null);
  };

  const handleArchive = (id: number) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, status: b.status === "Archived" ? "Active" : "Archived" } : b));
  };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0a1628", margin: 0 }}>School Boards</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{boards.filter(b => b.status === "Active").length} active boards</p>
          </div>
          <button
            onClick={() => setModal({ type: "create", board: { status: "Active" } })}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 9, border: "none", background: "#004aad", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} /> New Board
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a board..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {[
            { value: region, onChange: setRegion, options: regions },
            { value: statusFilter, onChange: setStatusFilter, options: ["All", "Active", "Archived"] },
          ].map((sel, i) => (
            <div key={i} style={{ position: "relative" }}>
              <select
                value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                style={{ padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", cursor: "pointer", outline: "none", appearance: "none" }}
              >
                {sel.options.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} color="#94a3b8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["School Board", "Region", "Schools", "Teachers", "Students", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ background: "#dff3ff", borderRadius: 8, padding: 7, flexShrink: 0 }}>
                        <Building2 size={14} color="#004aad" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{b.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{b.region}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.schools}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.teachers}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{b.students.toLocaleString("en-US")}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                      background: b.status === "Active" ? "#ecfdf5" : "#f8fafc",
                      color: b.status === "Active" ? "#059669" : "#94a3b8",
                    }}>{b.status}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setModal({ type: "edit", board: b })}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleArchive(b.id)}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444" }}
                      >
                        <Archive size={12} /> {b.status === "Archived" ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No board found.</div>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal.type === "create" ? "New School Board" : "Edit Board"}
          board={modal.board}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
