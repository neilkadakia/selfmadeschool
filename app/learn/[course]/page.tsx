import type { Metadata } from "next";
import AuthGate from "@/components/lms/AuthGate";
import CoursePage from "@/components/lms/CoursePage";
import LegacyRedirect from "@/components/lms/LegacyRedirect";
import { COURSES, getCourse, LEGACY_UNIT_REDIRECTS } from "@/lib/lms";

export function generateStaticParams() {
  return [
    ...COURSES.map((c) => ({ course: c.slug })),
    // v1 unit URLs lived at /learn/<unit>/. Keep them alive as redirects.
    ...Object.keys(LEGACY_UNIT_REDIRECTS).map((slug) => ({ course: slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await params;
  const c = getCourse(course);
  if (!c) return { title: "The 13th Grade", robots: { index: false } };
  return {
    title: `${c.title} · Self Made School`,
    description: c.description,
    robots: { index: false }, // private while the LMS is in closed session
  };
}

export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const redirect = LEGACY_UNIT_REDIRECTS[course];
  if (!getCourse(course) && redirect) return <LegacyRedirect to={redirect} />;
  return (
    <AuthGate>
      <CoursePage slug={course} />
    </AuthGate>
  );
}
