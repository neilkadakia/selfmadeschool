import type { Metadata } from "next";
import About from "@/components/About";

export const metadata: Metadata = {
  title: "About · Self Made School",
  description:
    "Self Made School is the school for everything after the diploma: adulting, money, and life's big calls, taught in plain English for 18-to-30-year-olds.",
};

export default function Page() {
  return <About />;
}
