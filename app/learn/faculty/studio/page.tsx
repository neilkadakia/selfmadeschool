import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import StudioRoom from "@/components/faculty/StudioRoom";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <StudioRoom />
      </FacultyOnly>
    </AuthGate>
  );
}
