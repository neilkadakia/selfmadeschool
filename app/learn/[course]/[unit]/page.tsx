import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import Player from "@/components/lms/Player";
import { COURSES, courseUnits, getCourseUnit } from "@/lib/lms";

export function generateStaticParams() {
  return COURSES.flatMap((c) =>
    courseUnits(c).map((u) => ({ course: c.slug, unit: u.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; unit: string }>;
}): Promise<Metadata> {
  const { course, unit } = await params;
  const u = getCourseUnit(course, unit);
  return {
    title: u ? `${u.title} — ${u.course.title}` : "Self Made School",
    description: u?.blurb,
    robots: { index: false }, // private while the LMS is in closed session
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ course: string; unit: string }>;
}) {
  const { course, unit } = await params;
  return (
    <AuthGate>
      <Player courseSlug={course} unitSlug={unit} />
    </AuthGate>
  );
}
