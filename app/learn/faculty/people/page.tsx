import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import FrontOffice from "@/components/faculty/FrontOffice";
import { ROLE_RANK } from "@/lib/api";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly min={ROLE_RANK.admin}>
        <FrontOffice />
      </FacultyOnly>
    </AuthGate>
  );
}
