import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import FieldWorkInbox from "@/components/faculty/FieldWorkInbox";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <FieldWorkInbox />
      </FacultyOnly>
    </AuthGate>
  );
}
