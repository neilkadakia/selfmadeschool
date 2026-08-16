import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import DemoTour from "@/components/DemoTour";

// The Walkthrough: private, administrator-only guided demo of the school.
// The public demo lesson lives at /demo/lesson.
//
// Noindexed here and kept out of the sitemap. The real protection is that
// the content is served by api/demo.php behind a token and a role check,
// so this route ships a renderer with nothing in it.

export const metadata: Metadata = {
  title: "The Walkthrough · Self Made School",
  description: "Private walkthrough of the school, the product, and the build.",
  robots: { index: false, follow: false },
};

export default function WalkthroughPage() {
  return (
    <AuthGate>
      <DemoTour />
    </AuthGate>
  );
}
