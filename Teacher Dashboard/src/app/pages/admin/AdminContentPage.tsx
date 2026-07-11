import { AdminLayout } from "./AdminLayout";
import { AdminPedagogicalUnitsPanel } from "./AdminPedagogicalUnitsPanel";

export function AdminContentPage() {
  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px" }}>
        <AdminPedagogicalUnitsPanel />
      </div>
    </AdminLayout>
  );
}
