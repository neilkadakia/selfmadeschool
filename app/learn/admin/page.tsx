import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Admin from "@/components/lms/Admin";

export const metadata: Metadata = {
  title: "Faculty Lounge · Self Made School",
  description: "School administration.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  );
}
