import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use · Self Made School",
  description:
    "The rules of the place: what Self Made School is, what it is not, and what we each agree to.",
};

export default function Page() {
  return (
    <section className="legal">
      <p className="kicker kicker--acc">The Fine Print</p>
      <h1 className="legal-h1">Terms of use, in plain English.</h1>
      <p className="legal-date">Effective 08-16-2026</p>

      <h2 className="legal-h2">What this is</h2>
      <p>
        Self Made School is a website and an online classroom that teaches the practical parts of
        adult life: your mindset, your money, and the big calls. Using the site means you agree to
        what is on this page. If you do not, that is fine, but please do not use the site.
      </p>

      <h2 className="legal-h2">It is education, not advice</h2>
      <p>
        Everything here is general education. It is not financial, legal, tax, medical, or
        professional advice, and nobody here is your advisor. Your situation has details we do not
        know about. Before you act on anything with real money or real consequences, talk to a
        licensed professional who can look at your actual numbers.
      </p>

      <h2 className="legal-h2">Not an accredited school</h2>
      <p>
        The school theming is on purpose and the material is real, but Self Made School is not an
        accredited institution. There are no degrees, no credits that transfer anywhere, and no
        transcripts. Badges, levels, and certificates are ours, and they mean what we say they
        mean: that you did the work here.
      </p>

      <h2 className="legal-h2">Your account</h2>
      <p>
        The classroom needs an account so your progress can follow you between devices. Keep your
        sign-in to yourself, give us information that is actually true, and use one account per
        person. You can delete your account whenever you want. We can close an account that is
        being used to harass people, break the law, or scrape the course.
      </p>

      <h2 className="legal-h2">The course material is ours</h2>
      <p>
        The lessons, videos, quizzes, flashcards, artwork, and the writing on this site belong to
        Self Made School. You are welcome to use all of it for your own life, quote a piece of it
        with credit, and share a link with anyone. You may not resell it, republish it as your own,
        or feed it into a product that competes with the school. The book is sold separately and
        the course never requires it.
      </p>

      <h2 className="legal-h2">What you write stays yours</h2>
      <p>
        Your notes, answers, and anything you post in the classroom belong to you. By posting in a
        shared space, you let us display it there to the people it was meant for. Do not post
        anything illegal, hateful, or someone else&apos;s private information, and do not post
        anything you would not want a classmate to read.
      </p>

      <h2 className="legal-h2">Free, and what that means</h2>
      <p>
        The 13th Grade is free, with no trial clock and no card required. We may add paid things
        later. If we ever charge for something you are using, you will hear about it before any
        money moves, never after.
      </p>

      <h2 className="legal-h2">We try hard, and we are still human</h2>
      <p>
        We work to keep the material accurate and the site online, but we cannot promise either
        perfectly. The site is provided as it is. Tax rules change, links rot, and typos survive
        three rounds of editing. Tell us when you find one and we will fix it.
      </p>

      <h2 className="legal-h2">Limits</h2>
      <p>
        Decisions you make about your money and your life are yours. To the extent the law allows,
        Self Made School is not liable for losses that follow from using the site or acting on
        something you read here.
      </p>

      <h2 className="legal-h2">Changes</h2>
      <p>
        If these terms change, this page changes first, and the date at the top changes with it.
        Real changes get an email to enrolled students, not a quiet edit.
      </p>

      <h2 className="legal-h2">Reaching a person</h2>
      <p>
        Questions about any of this go to hello@selfmadeschool.org. Our{" "}
        <Link href="/privacy">privacy page</Link> covers what we collect, which is very little.
      </p>
    </section>
  );
}
