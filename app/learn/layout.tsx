import Classroom from "@/components/lms/Classroom";
import LmsTheme from "@/components/lms/LmsTheme";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LmsTheme />
      <Classroom>{children}</Classroom>
    </>
  );
}
