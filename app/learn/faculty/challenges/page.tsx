import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import ChallengeDesk from "@/components/faculty/ChallengeDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <ChallengeDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
