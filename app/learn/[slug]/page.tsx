import type { Metadata } from "next";
import UnitPage from "@/components/UnitPage";
import { ALL_UNITS, getUnit } from "@/lib/curriculum";

export function generateStaticParams() {
  return ALL_UNITS.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const unit = getUnit(slug);
  return {
    title: unit ? `${unit.title} — The 13th Grade` : "The 13th Grade",
    description: unit?.blurb,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <UnitPage slug={slug} />;
}
