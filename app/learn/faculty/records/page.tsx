import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import Records from "@/components/faculty/Records";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <Records />
      </FacultyOnly>
    </AuthGate>
  );
}
