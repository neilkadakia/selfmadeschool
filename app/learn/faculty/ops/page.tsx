import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import SchoolOps from "@/components/faculty/SchoolOps";
import { ROLE_RANK } from "@/lib/api";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly min={ROLE_RANK.global_admin}>
        <SchoolOps />
      </FacultyOnly>
    </AuthGate>
  );
}
