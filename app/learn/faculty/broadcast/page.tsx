import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import BroadcastDesk from "@/components/faculty/BroadcastDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <BroadcastDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
