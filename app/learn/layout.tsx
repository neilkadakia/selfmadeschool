import Classroom from "@/components/lms/Classroom";
import LmsTheme from "@/components/lms/LmsTheme";
import Offline from "@/components/lms/Offline";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LmsTheme />
      <Offline />
      <Classroom>{children}</Classroom>
    </>
  );
}
