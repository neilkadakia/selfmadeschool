// The Faculty Lounge used to be one page of stacked tabs at /learn/admin.
// It is a set of rooms under /learn/faculty now. Anything bookmarked here
// gets forwarded to the Front Desk.

import type { Metadata } from "next";
import LegacyRedirect from "@/components/lms/LegacyRedirect";

export const metadata: Metadata = {
  title: "Faculty Lounge · Self Made School",
  robots: { index: false },
};

export default function Page() {
  return <LegacyRedirect to="/learn/faculty/" />;
}
