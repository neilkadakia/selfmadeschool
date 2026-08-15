import type { Metadata } from "next";
import DemoLesson from "@/components/DemoLesson";

const title = "Demo Lesson: Mindset Hacks | Self Made School";
const description =
  "Take Unit 01 of The 13th Grade free, no account needed: the full Mindset Hacks lesson with its knowledge check and flashcards. The other 23 units open with the founding class.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: "/demo" },
};

export default function DemoPage() {
  return <DemoLesson />;
}
