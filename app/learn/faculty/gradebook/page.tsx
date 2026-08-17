import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import Gradebook from "@/components/faculty/Gradebook";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <Gradebook />
      </FacultyOnly>
    </AuthGate>
  );
}
