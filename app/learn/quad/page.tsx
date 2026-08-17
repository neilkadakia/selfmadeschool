import { Suspense } from "react";
import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Quad from "@/components/lms/Quad";

export const metadata: Metadata = {
  title: "The Quad · Self Made School",
  description: "Clubs are rooms. Join the ones you want and the class hears you.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="learn" aria-busy="true" />}>
        <Quad />
      </Suspense>
    </AuthGate>
  );
}
