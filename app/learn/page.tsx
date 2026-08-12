import type { Metadata } from "next";
import LearnHome from "@/components/lms/LearnHome";

export const metadata: Metadata = {
  title: "My Learning — Self Made School",
  description:
    "Three courses on mindset, money, and life's big calls. Free, self-paced, no account needed.",
};

export default function Page() {
  return <LearnHome />;
}
