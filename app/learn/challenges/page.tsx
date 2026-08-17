import { Suspense } from "react";
import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Challenges from "@/components/lms/Challenges";

export const metadata: Metadata = {
  title: "Challenges · Self Made School",
  description: "A deadline with a number on it, measured from the day you join.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="learn" aria-busy="true" />}>
        <Challenges />
      </Suspense>
    </AuthGate>
  );
}
