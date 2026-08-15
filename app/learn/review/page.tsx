import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import StudyHall from "@/components/lms/StudyHall";

export const metadata: Metadata = {
  title: "Study Hall · Self Made School",
  description: "Review flashcards from every unit you've completed.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <StudyHall />
    </AuthGate>
  );
}
