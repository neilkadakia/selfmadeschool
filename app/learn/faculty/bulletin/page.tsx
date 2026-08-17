import AuthGate from "@/components/lms/AuthGate";
import { FacultyOnly } from "@/components/faculty/ui";
import BulletinDesk from "@/components/faculty/BulletinDesk";

export default function Page() {
  return (
    <AuthGate>
      <FacultyOnly>
        <BulletinDesk />
      </FacultyOnly>
    </AuthGate>
  );
}
