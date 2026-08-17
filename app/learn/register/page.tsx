import { Suspense } from "react";
import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Register from "@/components/lms/Register";

export const metadata: Metadata = {
  title: "The Register · Self Made School",
  description: "Everyone else doing this, and the kudos they have been handed.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="learn" aria-busy="true" />}>
        <Register />
      </Suspense>
    </AuthGate>
  );
}
