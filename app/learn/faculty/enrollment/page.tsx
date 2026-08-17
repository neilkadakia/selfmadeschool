import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import Enrollment from "@/components/faculty/Enrollment";
import { ROLE_RANK } from "@/lib/api";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly min={ROLE_RANK.admin}>
        <Enrollment />
      </FacultyOnly>
    </AuthGate>
  );
}
