import Home from "@/components/Home";
import { FAQS } from "@/lib/faqs";
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
        "The school for everything after the diploma: adulting, money, and life's big calls, taught in plain English.",
    },
    {
      "@type": "Course",
      name: "The 13th Grade",
      description:
        "The foundational and introductory course. Working on your mindset, your money, and dealing with life's big calls: the groundwork for running your own life, in 24 units.",
      isAccessibleForFree: true,
      provider: { "@id": `${siteUrl}/#org` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
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
