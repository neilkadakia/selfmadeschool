import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Profile from "@/components/lms/Profile";

export const metadata: Metadata = {
  title: "Your Student File · Self Made School",
  description: "Identity, appearance, security, and your learning insights.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Profile />
    </AuthGate>
  );
}
