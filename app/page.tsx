import Home from "@/components/Home";
import { siteUrl } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#org`,
      name: "Self Made School",
      url: siteUrl,
      description:
        "The school for everything after the diploma — adulting, money, and the big calls, taught in plain English.",
    },
    {
      "@type": "Course",
      name: "The 13th Grade",
      description:
        "The intro course. Mindset, money, and the big calls — the foundations of running your own life, in six units.",
      isAccessibleForFree: true,
      provider: { "@id": `${siteUrl}/#org` },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Home />
    </>
  );
}
