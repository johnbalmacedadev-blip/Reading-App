import { BoardLayout } from "../components/BoardLayout";
import { TeacherRequestsPanel } from "../components/TeacherRequestsPanel";

export function BoardTeacherRequestsPage() {
  return (
    <BoardLayout activeNav="teachers">
      <TeacherRequestsPanel portal="board" />
    </BoardLayout>
  );
}
