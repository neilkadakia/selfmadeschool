import type { Metadata } from "next";
import About from "@/components/About";

export const metadata: Metadata = {
  title: "About · Self Made School",
  description:
    "Self Made School is the school for everything after the diploma: adulting, money, and life's big calls, taught in plain English, primarily for young adults.",
};

export default function Page() {
  return <About />;
}
