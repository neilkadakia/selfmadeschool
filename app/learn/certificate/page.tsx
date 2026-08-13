import type { Metadata } from "next";
import { Suspense } from "react";
import AuthGate from "@/components/lms/AuthGate";
import Certificate from "@/components/lms/Certificate";

export const metadata: Metadata = {
  title: "Your Certificate — Self Made School",
  description: "Print-ready proof you finished the course. Earned, not given.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="learn" />}>
      <AuthGate>
        <Certificate />
      </AuthGate>
    </Suspense>
  );
}
