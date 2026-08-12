import type { Metadata } from "next";
import Learn from "@/components/Learn";

export const metadata: Metadata = {
  title: "The 13th Grade — Self Made School",
  description:
    "24 units across three parts — Growing Your Mindset, Mastering Money, Life's Big Calls. Read the chapter, watch the 10-minute module, do the thing. Free.",
};

export default function Page() {
  return <Learn />;
}
