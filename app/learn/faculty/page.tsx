import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import FrontDesk from "@/components/faculty/FrontDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <FrontDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
