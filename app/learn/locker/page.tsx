import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Locker from "@/components/lms/Locker";

export const metadata: Metadata = {
  title: "The Locker · Self Made School",
  description: "Your portrait, your gear, and the school store.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Locker />
    </AuthGate>
  );
}
