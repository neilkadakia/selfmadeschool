import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const title = "Self Made School: School Never Taught You This";
const description =
  "Working on your mindset, your money, and dealing with life's big calls: all the adult stuff you were supposed to just know, taught in plain English. Enroll free in The 13th Grade.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  // The classroom installs to a home screen and reads with no signal;
  // public/sw.js does the caching, components/lms/Offline.tsx registers it.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Self Made", statusBarStyle: "black-translucent" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Self Made School",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0E12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before React hydrates; scope is this element's
          attributes only, so real hydration issues elsewhere still surface. */}
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to Content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
