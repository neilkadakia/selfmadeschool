import type { Metadata } from "next";
import Verify from "@/components/Verify";

export const metadata: Metadata = {
  title: "Check a Certificate · Self Made School",
  description:
    "Confirm a Self Made School certificate: the name on it, the course, and whether the final was passed.",
};

export default function Page() {
  return <Verify />;
}
