import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import StudyGroupFeed from "@/components/faculty/StudyGroupFeed";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <StudyGroupFeed />
      </FacultyOnly>
    </AuthGate>
  );
}
