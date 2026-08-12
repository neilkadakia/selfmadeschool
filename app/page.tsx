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
        "The school for everything after the diploma — adulting, money, and life's big calls, taught in plain English.",
    },
    {
      "@type": "Course",
      name: "The 13th Grade",
      description:
        "The intro course. Working on your mindset, your money, and dealing with life's big calls — the foundations of running your own life, in 24 units.",
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
