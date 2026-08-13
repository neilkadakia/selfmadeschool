import type { Metadata } from "next";
import { Suspense } from "react";
import AuthGate from "@/components/lms/AuthGate";
import FinalExam from "@/components/lms/FinalExam";

export const metadata: Metadata = {
  title: "The Final — Self Made School",
  description: "Twelve questions. One course. Pass with honors.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="learn" />}>
      <AuthGate>
        <FinalExam />
      </AuthGate>
    </Suspense>
  );
}
