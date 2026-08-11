import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
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

export const metadata: Metadata = {
  title: "Self Made School — School Never Taught You This",
  description:
    "Mindset, money, and the big calls — all the adult stuff you were supposed to just know, taught in plain English. Enroll free in The 13th Grade.",
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
        <Nav />
        {children}
        <Footer />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
