import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import AskDesk from "@/components/faculty/AskDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <AskDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
