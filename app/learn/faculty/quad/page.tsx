import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import QuadDesk from "@/components/faculty/QuadDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <QuadDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
