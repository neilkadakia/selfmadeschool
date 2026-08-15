import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import LearnHome from "@/components/lms/LearnHome";

export const metadata: Metadata = {
  title: "My Learning · Self Made School",
  description:
    "Three courses on mindset, money, and life's big calls. Free, self-paced. Invite-only while we build.",
  robots: { index: false }, // private while the LMS is in closed session
};

export default function Page() {
  return (
    <AuthGate>
      <LearnHome />
    </AuthGate>
  );
}
