import { Suspense } from "react";
import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Arena from "@/components/lms/Arena";

export const metadata: Metadata = {
  title: "The After-School Arena — Self Made School",
  description: "Every section has a boss. Answer well, hit hard.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="learn" aria-busy="true" />}>
        <Arena />
      </Suspense>
    </AuthGate>
  );
}
